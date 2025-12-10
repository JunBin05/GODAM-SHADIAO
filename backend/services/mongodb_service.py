"""
MongoDB service - handles all MongoDB Atlas operations
Replaces Firebase Firestore
"""
import os
from typing import Optional, Dict, List, Any
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB client instance
_client: Optional[MongoClient] = None
_db: Optional[Database] = None

def get_db() -> Database:
    """Get or initialize MongoDB database instance"""
    global _client, _db
    if _db is None:
        # Get MongoDB URI from environment
        mongo_uri = os.getenv('MONGODB_URI')
        if not mongo_uri:
            raise ValueError("MONGODB_URI not found in environment variables")
        
        # Initialize MongoDB client with timeout settings
        _client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000,
            socketTimeoutMS=5000
        )
        _db = _client['godam_shadiao']  # Database name
        
        print("✓ MongoDB Atlas connected successfully")
        print(f"  Database: {_db.name}")
    
    return _db


# ============ USER OPERATIONS ============

def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by user_id (IC number is the _id)"""
    db = get_db()
    user = db.users.find_one({"_id": user_id})
    return user


def get_user_by_ic(ic: str) -> Optional[Dict]:
    """Get user by IC number (IC is the _id in MongoDB)"""
    return get_user_by_id(ic)


def create_user(user_data: Dict) -> str:
    """Create a new user. IC number should be in user_data as 'ic' or use as _id"""
    db = get_db()
    
    # Use IC as the _id
    ic = user_data.get('ic') or user_data.get('_id')
    if not ic:
        raise ValueError("IC number required for user creation")
    
    # Prepare document
    doc = user_data.copy()
    doc['_id'] = ic
    
    # Remove duplicate ic field if exists
    doc.pop('ic', None)
    
    db.users.insert_one(doc)
    return ic


def update_user(user_id: str, update_data: Dict) -> bool:
    """Update user data"""
    db = get_db()
    result = db.users.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )
    return result.modified_count > 0


def delete_user(user_id: str) -> bool:
    """Delete a user"""
    db = get_db()
    result = db.users.delete_one({"_id": user_id})
    return result.deleted_count > 0


def user_exists(ic: str) -> bool:
    """Check if user exists"""
    db = get_db()
    return db.users.count_documents({"_id": ic}, limit=1) > 0


# ============ FINANCIAL AID OPERATIONS ============

def get_financial_aid(ic: str) -> Optional[Dict]:
    """Get financial aid data by IC"""
    db = get_db()
    return db.financialAid.find_one({"_id": ic})


def create_financial_aid(ic: str, aid_data: Dict) -> str:
    """Create financial aid record"""
    db = get_db()
    doc = aid_data.copy()
    doc['_id'] = ic
    db.financialAid.insert_one(doc)
    return ic


def update_financial_aid(ic: str, update_data: Dict) -> bool:
    """Update financial aid data"""
    db = get_db()
    result = db.financialAid.update_one(
        {"_id": ic},
        {"$set": update_data}
    )
    return result.modified_count > 0


# ============ STORE OPERATIONS ============

def get_stores_by_location(lat: float, lng: float, radius_km: float = 5, limit: int = 10) -> List[Dict]:
    """Get stores near a location (KL area only)"""
    db = get_db()
    
    # Simple distance calculation (not accurate for large distances)
    # For production, use MongoDB geospatial queries
    stores = list(db.stores.find(
        {
            "lat": {"$gte": lat - 0.05, "$lte": lat + 0.05},
            "lng": {"$gte": lng - 0.05, "$lte": lng + 0.05}
        }
    ).limit(limit))
    
    return stores


def get_all_stores(limit: int = 100) -> List[Dict]:
    """Get all stores (limited to KL area)"""
    db = get_db()
    return list(db.stores.find().limit(limit))


def create_store(store_data: Dict) -> str:
    """Create a new store"""
    db = get_db()
    result = db.stores.insert_one(store_data)
    return str(result.inserted_id)


# ============ TRANSACTION OPERATIONS ============

def get_user_transactions(user_id: str, limit: int = 50) -> List[Dict]:
    """Get user transactions"""
    db = get_db()
    return list(db.transactions.find(
        {"userId": user_id}
    ).sort("date", -1).limit(limit))


def create_transaction(transaction_data: Dict) -> str:
    """Create a new transaction"""
    db = get_db()
    result = db.transactions.insert_one(transaction_data)
    return str(result.inserted_id)


# ============ REMINDER OPERATIONS ============

def get_user_reminders(user_id: str) -> List[Dict]:
    """Get user reminders"""
    db = get_db()
    return list(db.reminders.find({"userId": user_id}))


def create_reminder(reminder_data: Dict) -> str:
    """Create a new reminder"""
    db = get_db()
    result = db.reminders.insert_one(reminder_data)
    return str(result.inserted_id)


def update_reminder(reminder_id: str, update_data: Dict) -> bool:
    """Update a reminder"""
    db = get_db()
    from bson.objectid import ObjectId
    result = db.reminders.update_one(
        {"_id": ObjectId(reminder_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0


def delete_reminder(reminder_id: str) -> bool:
    """Delete a reminder"""
    db = get_db()
    from bson.objectid import ObjectId
    result = db.reminders.delete_one({"_id": ObjectId(reminder_id)})
    return result.deleted_count > 0


# ============ TRANSLATION OPERATIONS ============

def get_translations() -> Dict:
    """Get all translations"""
    db = get_db()
    translations_doc = db.translations.find_one({"_id": "translations"})
    if translations_doc:
        # Remove _id field
        translations_doc.pop('_id', None)
        return translations_doc
    return {}


def update_translations(translations: Dict) -> bool:
    """Update translations"""
    db = get_db()
    result = db.translations.update_one(
        {"_id": "translations"},
        {"$set": translations},
        upsert=True
    )
    return result.modified_count > 0 or result.upserted_id is not None

# ============ VOICE EMBEDDING OPERATIONS ============
def save_face_embedding(ic: str, embedding: List[float]) -> bool:
    """Save face embedding to user document"""
    db = get_db()

    # Check if user exists
    user = db.users.find_one({"_id": ic})

    if user:
        # Update existing user
        result = db.users.update_one(
            {"_id": ic},
            {"$set": {"face_embedding": embedding}}
        )
        return result.modified_count > 0
    else:
        # Create new user
        db.users.insert_one({
            "_id": ic,
            "name": "Unknown",
            "face_embedding": embedding,
            "created_date": "2024-12-10"
        })
        return True


def get_face_embedding(ic: str) -> Optional[List[float]]:
    """Get face embedding for a user by IC"""
    user = get_user_by_id(ic)
    if user and 'face_embedding' in user:
        return user['face_embedding']
    return None


# ============ VOICE EMBEDDING OPERATIONS ============

def save_voice_embedding(ic: str, embedding: List[float]) -> bool:
    """Save voice embedding to user document"""
    db = get_db()
    
    # Check if user exists
    user = db.users.find_one({"_id": ic})
    
    update_data = {"voiceEmbedding": embedding}
    
    if user:
        # Update existing user
        result = db.users.update_one(
            {"_id": ic},
            {"$set": update_data}
        )
        return result.modified_count > 0
    else:
        # Create new user
        db.users.insert_one({
            "_id": ic,
            "voiceEmbedding": embedding,
            "created_date": "2024-12-10"
        })
        return True


def load_voice_embedding(ic: str) -> Optional[List[float]]:
    """Load voice embedding from user document"""
    db = get_db()
    user = db.users.find_one({"_id": ic})
    if user and 'voiceEmbedding' in user:
        return user['voiceEmbedding']
    return None


# ============ UTILITY FUNCTIONS ============

def close_connection():
    """Close MongoDB connection"""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        print("✓ MongoDB connection closed")
