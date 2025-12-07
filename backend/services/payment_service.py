import json
import os
import hashlib
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from config import QR_EXPIRY_MINUTES

# In-memory storage for active QR codes (in production, use Redis or database)
active_qr_codes = {}

def load_users() -> list:
    """Load users from mock data"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(current_dir, '..', 'data', 'mock_users.json')
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('users', [])
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def load_stores() -> list:
    """Load stores from mock data"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(current_dir, '..', 'data', 'mock_stores.json')
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('stores', [])
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def get_user_balance(user_id: str, program_id: str) -> Optional[float]:
    """Get user's current balance for a program"""
    users = load_users()
    
    for user in users:
        if user['user_id'] == user_id:
            # Check if user is enrolled in the program
            if program_id not in user.get('enrolled_programs', []):
                return None
            
            # For MyKasih, calculate balance from transactions
            if program_id == 'mykasih':
                # Load transaction history
                try:
                    current_dir = os.path.dirname(os.path.abspath(__file__))
                    data_path = os.path.join(current_dir, '..', 'data', 'mock_aid_data.json')
                    with open(data_path, 'r', encoding='utf-8') as f:
                        aid_data = json.load(f)
                        transactions = aid_data.get('transactions', {}).get(user_id, {}).get(program_id, [])
                        
                        # Calculate balance: credits - debits
                        balance = 0
                        for txn in transactions:
                            if txn['type'] == 'credit':
                                balance += txn['amount']
                            else:
                                balance -= txn['amount']
                        
                        return balance
                except:
                    return 200.0  # Default balance
            
            # For STR/SARA, return fixed monthly payment amounts
            elif program_id == 'str':
                return 300.0  # Fixed STR payment
            elif program_id == 'sara':
                return 100.0  # Fixed SARA payment
    
    return None


def generate_transaction_id() -> str:
    """Generate unique transaction ID"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    import random
    random_suffix = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    return f"TXN-{timestamp}-{random_suffix}"


def generate_signature(transaction_id: str, user_id: str, amount: float, store_id: str) -> str:
    """Generate cryptographic signature for QR code validation"""
    data_string = f"{transaction_id}|{user_id}|{amount}|{store_id}"
    return hashlib.sha256(data_string.encode()).hexdigest()[:32]


def generate_qr_code(
    user_id: str,
    program_id: str,
    amount: float,
    store_id: str
) -> Tuple[str, str, datetime, str]:
    """
    Generate QR code for payment.
    
    Returns:
        Tuple of (qr_code_base64, transaction_id, expires_at, signature)
    """
    # Generate transaction ID
    transaction_id = generate_transaction_id()
    
    # Calculate expiry time
    expires_at = datetime.now() + timedelta(minutes=QR_EXPIRY_MINUTES)
    
    # Generate signature
    signature = generate_signature(transaction_id, user_id, amount, store_id)
    
    # Create QR code payload
    qr_payload = {
        "transaction_id": transaction_id,
        "user_id": user_id,
        "program_id": program_id,
        "amount": amount,
        "store_id": store_id,
        "expires_at": expires_at.isoformat(),
        "signature": signature
    }
    
    # Store in active QR codes (for validation)
    active_qr_codes[transaction_id] = qr_payload
    
    # Generate QR code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(json.dumps(qr_payload))
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode()
    
    return img_base64, transaction_id, expires_at, signature


def verify_qr_code(transaction_id: str, store_id: str, signature: str) -> Tuple[bool, str, Optional[Dict]]:
    """
    Verify QR code and process payment.
    
    Returns:
        Tuple of (success, message, payment_data)
    """
    # Check if QR code exists
    if transaction_id not in active_qr_codes:
        return False, "Invalid or expired QR code", None
    
    qr_data = active_qr_codes[transaction_id]
    
    # Verify signature
    expected_signature = generate_signature(
        transaction_id,
        qr_data['user_id'],
        qr_data['amount'],
        qr_data['store_id']
    )
    
    if signature != expected_signature:
        return False, "Invalid QR code signature", None
    
    # Check expiry
    expires_at = datetime.fromisoformat(qr_data['expires_at'])
    if datetime.now() > expires_at:
        # Remove expired QR code
        del active_qr_codes[transaction_id]
        return False, "QR code has expired. Please generate a new one.", None
    
    # Verify store ID matches
    if qr_data['store_id'] != store_id:
        return False, f"QR code is for store {qr_data['store_id']}, not {store_id}", None
    
    # Check user balance
    current_balance = get_user_balance(qr_data['user_id'], qr_data['program_id'])
    
    if current_balance is None:
        return False, f"User not enrolled in {qr_data['program_id']} program", None
    
    if current_balance < qr_data['amount']:
        return False, f"Insufficient balance. Available: RM{current_balance:.2f}, Required: RM{qr_data['amount']:.2f}", None
    
    # Process payment (in production, this would update the database)
    new_balance = current_balance - qr_data['amount']
    
    # Get store details
    stores = load_stores()
    store = next((s for s in stores if s['store_id'] == store_id), None)
    
    if not store:
        return False, "Store not found", None
    
    # Create payment receipt
    payment_data = {
        "transaction_id": transaction_id,
        "user_id": qr_data['user_id'],
        "program_id": qr_data['program_id'],
        "amount": qr_data['amount'],
        "store_name": store.get('name', 'Unknown Store'),
        "store_address": store.get('address', 'N/A'),
        "timestamp": datetime.now().isoformat(),
        "previous_balance": current_balance,
        "new_balance": new_balance,
        "status": "success"
    }
    
    # Remove used QR code
    del active_qr_codes[transaction_id]
    
    return True, "Payment processed successfully", payment_data


def get_store_by_id(store_id: str) -> Optional[Dict]:
    """Get store details by ID"""
    stores = load_stores()
    return next((s for s in stores if s['store_id'] == store_id), None)
