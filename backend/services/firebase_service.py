"""
Firebase service - handles all Firebase Firestore operations
"""
import os
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional, Dict, List, Any

# Initialize Firebase
_db = None

def get_db():
    """Get or initialize Firestore database instance"""
    global _db
    if _db is None:
        # Check if already initialized
        try:
            firebase_admin.get_app()
        except ValueError:
            # Not initialized, initialize now
            # Look for serviceAccountKey.json in project root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            cred_path = os.path.join(project_root, 'serviceAccountKey.json')
            
            if not os.path.exists(cred_path):
                raise FileNotFoundError(f"Firebase credentials not found at {cred_path}")
            
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        
        _db = firestore.client()
    return _db


# ============ USER OPERATIONS ============

def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by user_id"""
    db = get_db()
    doc = db.collection('users').document(user_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


def get_user_by_ic(ic: str) -> Optional[Dict]:
    """Get user by IC number"""
    db = get_db()
    users = db.collection('users').where('ic', '==', ic).limit(1).stream()
    for user in users:
        return user.to_dict()
    return None


def get_all_users() -> List[Dict]:
    """Get all users"""
    db = get_db()
    users = []
    for doc in db.collection('users').stream():
        users.append(doc.to_dict())
    return users


def create_user(user_data: Dict) -> str:
    """Create a new user, returns user_id"""
    db = get_db()
    user_id = user_data.get('user_id')
    if user_id:
        db.collection('users').document(user_id).set(user_data)
        return user_id
    else:
        doc_ref = db.collection('users').add(user_data)
        return doc_ref[1].id


def update_user(user_id: str, updates: Dict) -> bool:
    """Update user fields"""
    db = get_db()
    try:
        db.collection('users').document(user_id).update(updates)
        return True
    except Exception as e:
        print(f"Error updating user: {e}")
        return False


def update_voice_embedding(user_id: str, embedding: list) -> bool:
    """Update user's voice embedding"""
    return update_user(user_id, {'voiceEmbedding': embedding})


def update_face_embedding(user_id: str, embedding: list) -> bool:
    """Update user's face embedding"""
    return update_user(user_id, {'faceEmbedding': embedding})


# ============ TRANSACTION OPERATIONS ============

def get_user_transactions(user_id: str) -> Optional[Dict]:
    """Get all transactions for a user"""
    db = get_db()
    doc = db.collection('transactions').document(user_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


def get_program_transactions(user_id: str, program_id: str) -> List[Dict]:
    """Get transactions for a specific program"""
    transactions = get_user_transactions(user_id)
    if transactions:
        return transactions.get(program_id, [])
    return []


def add_transaction(user_id: str, program_id: str, transaction: Dict) -> bool:
    """Add a new transaction for a user"""
    db = get_db()
    try:
        doc_ref = db.collection('transactions').document(user_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            if program_id not in data:
                data[program_id] = []
            data[program_id].insert(0, transaction)  # Add to front
            doc_ref.set(data)
        else:
            doc_ref.set({program_id: [transaction]})
        
        return True
    except Exception as e:
        print(f"Error adding transaction: {e}")
        return False


# ============ REMINDER OPERATIONS ============

def get_user_reminders(user_id: str) -> List[Dict]:
    """Get all reminders for a user"""
    db = get_db()
    doc = db.collection('reminders').document(user_id).get()
    if doc.exists:
        data = doc.to_dict()
        return data.get('reminders', [])
    return []


def add_reminder(user_id: str, reminder: Dict) -> bool:
    """Add a reminder for a user"""
    db = get_db()
    try:
        doc_ref = db.collection('reminders').document(user_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            reminders = data.get('reminders', [])
            reminders.append(reminder)
            doc_ref.update({'reminders': reminders})
        else:
            doc_ref.set({'reminders': [reminder]})
        
        return True
    except Exception as e:
        print(f"Error adding reminder: {e}")
        return False


def delete_reminder(user_id: str, reminder_id: str) -> bool:
    """Delete a reminder"""
    db = get_db()
    try:
        doc_ref = db.collection('reminders').document(user_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            reminders = data.get('reminders', [])
            reminders = [r for r in reminders if r.get('reminder_id') != reminder_id]
            doc_ref.update({'reminders': reminders})
            return True
        return False
    except Exception as e:
        print(f"Error deleting reminder: {e}")
        return False


# ============ STORE OPERATIONS ============

def get_stores_by_state(state: str) -> List[Dict]:
    """Get stores by state"""
    db = get_db()
    stores = []
    query = db.collection('stores').where('state', '==', state).stream()
    for doc in query:
        stores.append(doc.to_dict())
    return stores


def get_stores_by_city(city: str) -> List[Dict]:
    """Get stores by city"""
    db = get_db()
    stores = []
    query = db.collection('stores').where('city', '==', city).stream()
    for doc in query:
        stores.append(doc.to_dict())
    return stores


def get_all_stores() -> List[Dict]:
    """Get all stores (warning: this could be large)"""
    db = get_db()
    stores = []
    for doc in db.collection('stores').stream():
        stores.append(doc.to_dict())
    return stores


def search_stores_by_name(name_query: str, limit: int = 50) -> List[Dict]:
    """Search stores by name (case-insensitive prefix search)"""
    db = get_db()
    stores = []
    # Firestore doesn't support LIKE queries, so we do a range query
    query = db.collection('stores')\
        .where('tradingName', '>=', name_query)\
        .where('tradingName', '<=', name_query + '\uf8ff')\
        .limit(limit)\
        .stream()
    for doc in query:
        stores.append(doc.to_dict())
    return stores


# ============ TRANSLATION OPERATIONS ============

def get_translations() -> Dict:
    """Get all translations"""
    db = get_db()
    translations = {}
    for doc in db.collection('translations').stream():
        translations[doc.id] = doc.to_dict()
    return translations


def get_translation(category: str, key: str, lang: str = 'en') -> Optional[str]:
    """Get a specific translation"""
    db = get_db()
    doc = db.collection('translations').document(category).get()
    if doc.exists:
        data = doc.to_dict()
        if key in data:
            return data[key].get(lang, data[key].get('en'))
    return None
