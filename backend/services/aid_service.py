"""
Aid service - handles aid program business logic
"""
import json
import os
from typing import List, Dict, Optional

# Data directory
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
USERS_FILE = os.path.join(DATA_DIR, 'mock_users.json')
AID_DATA_FILE = os.path.join(DATA_DIR, 'mock_aid_data.json')


def load_users() -> List[Dict]:
    """Load users from mock data"""
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data['users']


def load_aid_data() -> Dict:
    """Load aid data (transactions, reminders)"""
    with open(AID_DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by user_id"""
    users = load_users()
    for user in users:
        if user['user_id'] == user_id:
            return user
    return None


def get_aid_status(user_id: str) -> List[Dict]:
    """
    Get enrollment status for all 3 programs
    
    Returns:
        List of program status dictionaries
    """
    user = get_user_by_id(user_id)
    if not user:
        return None
    
    enrolled_programs = user.get('enrolled_programs', [])
    
    programs = [
        {
            "program_id": "str",
            "program_name": "Sumbangan Tunai Rahmah",
            "enrollment_status": "enrolled" if "str" in enrolled_programs else "not_enrolled",
            "application_date": user.get('created_date') if "str" in enrolled_programs else None,
            "eligibility_status": "approved" if "str" in enrolled_programs else None
        },
        {
            "program_id": "sara",
            "program_name": "SARA",
            "enrollment_status": "enrolled" if "sara" in enrolled_programs else "not_enrolled",
            "application_date": user.get('created_date') if "sara" in enrolled_programs else None,
            "eligibility_status": "approved" if "sara" in enrolled_programs else None
        },
        {
            "program_id": "mykasih",
            "program_name": "MyKasih",
            "enrollment_status": "enrolled" if "mykasih" in enrolled_programs else "not_enrolled",
            "application_date": user.get('created_date') if "mykasih" in enrolled_programs else None,
            "eligibility_status": "approved" if "mykasih" in enrolled_programs else None
        }
    ]
    
    return programs


def get_aid_balance(user_id: str, program_id: str) -> Optional[Dict]:
    """
    Get balance for a specific program
    
    Returns:
        Balance information dictionary
    """
    user = get_user_by_id(user_id)
    if not user:
        return None
    
    enrolled_programs = user.get('enrolled_programs', [])
    if program_id not in enrolled_programs:
        return None
    
    aid_data = load_aid_data()
    transactions = aid_data.get('transactions', {}).get(user_id, {}).get(program_id, [])
    
    balance_info = {
        "program_id": program_id,
        "program_name": get_program_name(program_id)
    }
    
    if program_id == "mykasih":
        # Calculate current balance from transactions
        current_balance = 0.0
        last_transaction_date = None
        
        if transactions:
            # Get the most recent balance
            current_balance = transactions[0].get('balance_after', 0.0)
            last_transaction_date = transactions[0].get('date')
        
        # Monthly allocation (with disability bonus)
        monthly_allocation = 250.0 if user.get('disability_status') else 200.0
        
        balance_info.update({
            "current_balance": current_balance,
            "last_payment_date": last_transaction_date,
            "monthly_allocation": monthly_allocation
        })
    
    else:  # STR or SARA
        # Fixed payment amounts
        base_amount = 300.0 if program_id == "str" else 500.0
        disability_bonus = 100.0 if program_id == "str" else 150.0
        payment_amount = base_amount + (disability_bonus if user.get('disability_status') else 0)
        
        balance_info.update({
            "payment_amount": payment_amount,
            "last_payment_date": "2024-11-01",
            "next_payment_date": "2024-12-01"
        })
    
    return balance_info


def get_aid_history(user_id: str, program_id: str) -> Optional[List[Dict]]:
    """
    Get transaction history for a specific program
    
    Returns:
        List of transactions (last 20, sorted by date descending)
    """
    user = get_user_by_id(user_id)
    if not user:
        return None
    
    enrolled_programs = user.get('enrolled_programs', [])
    if program_id not in enrolled_programs:
        return None
    
    aid_data = load_aid_data()
    transactions = aid_data.get('transactions', {}).get(user_id, {}).get(program_id, [])
    
    # Return last 20 transactions (already sorted by date descending in mock data)
    return transactions[:20]


def get_program_name(program_id: str) -> str:
    """Get program display name"""
    names = {
        "str": "Sumbangan Tunai Rahmah",
        "sara": "SARA",
        "mykasih": "MyKasih"
    }
    return names.get(program_id, program_id)
