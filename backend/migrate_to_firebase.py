"""
Migration script - Upload all mock data to Firebase Firestore
Run this once to populate Firebase with initial data.
"""
import json
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cred_path = os.path.join(project_root, 'serviceAccountKey.json')

if not os.path.exists(cred_path):
    print(f"Error: serviceAccountKey.json not found at {cred_path}")
    sys.exit(1)

print(f"Using credentials from: {cred_path}")

try:
    firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')


def upload_users():
    """Upload users from mock_users.json"""
    print("\n📤 Uploading users...")
    
    with open(os.path.join(DATA_DIR, 'mock_users.json'), 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    users = data.get('users', [])
    batch = db.batch()
    count = 0
    
    for user in users:
        user_id = user.get('user_id')
        if user_id:
            doc_ref = db.collection('users').document(user_id)
            batch.set(doc_ref, user)
            count += 1
    
    batch.commit()
    print(f"   ✅ Uploaded {count} users")
    return count


def upload_transactions():
    """Upload transactions from mock_aid_data.json"""
    print("\n📤 Uploading transactions...")
    
    with open(os.path.join(DATA_DIR, 'mock_aid_data.json'), 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    transactions = data.get('transactions', {})
    batch = db.batch()
    count = 0
    
    for user_id, user_transactions in transactions.items():
        doc_ref = db.collection('transactions').document(user_id)
        batch.set(doc_ref, user_transactions)
        count += 1
    
    batch.commit()
    print(f"   ✅ Uploaded transactions for {count} users")
    return count


def upload_reminders():
    """Upload reminders from mock_aid_data.json"""
    print("\n📤 Uploading reminders...")
    
    with open(os.path.join(DATA_DIR, 'mock_aid_data.json'), 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    reminders = data.get('reminders', {})
    batch = db.batch()
    count = 0
    
    for user_id, user_reminders in reminders.items():
        doc_ref = db.collection('reminders').document(user_id)
        batch.set(doc_ref, {'reminders': user_reminders})
        count += 1
    
    batch.commit()
    print(f"   ✅ Uploaded reminders for {count} users")
    return count


def upload_stores():
    """Upload stores from store_lists.json (in batches of 500)"""
    print("\n📤 Uploading stores (this may take a while)...")
    
    with open(os.path.join(DATA_DIR, 'store_lists.json'), 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    stores = data.get('data', [])
    total = len(stores)
    print(f"   Found {total} stores to upload")
    
    # Firestore batch limit is 500 operations
    batch_size = 500
    uploaded = 0
    
    for i in range(0, total, batch_size):
        batch = db.batch()
        chunk = stores[i:i + batch_size]
        
        for store in chunk:
            merchant_id = store.get('merchantId', '')
            if merchant_id:
                # Store with merchantId as document ID
                doc_ref = db.collection('stores').document(merchant_id)
                batch.set(doc_ref, store)
        
        batch.commit()
        uploaded += len(chunk)
        print(f"   Uploaded {uploaded}/{total} stores...", end='\r')
    
    print(f"\n   ✅ Uploaded {uploaded} stores")
    return uploaded


def upload_translations():
    """Upload translations from translations.json"""
    print("\n📤 Uploading translations...")
    
    with open(os.path.join(DATA_DIR, 'translations.json'), 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    batch = db.batch()
    count = 0
    
    for category, translations in data.items():
        doc_ref = db.collection('translations').document(category)
        batch.set(doc_ref, translations)
        count += 1
    
    batch.commit()
    print(f"   ✅ Uploaded {count} translation categories")
    return count


def main():
    print("=" * 50)
    print("🔥 Firebase Migration Script")
    print("=" * 50)
    print(f"\nProject: tolonglah-voice-assistant")
    
    try:
        # Test connection first
        print("\n🔌 Testing Firebase connection...")
        test_ref = db.collection('_test').document('connection_test')
        test_ref.set({'test': True, 'timestamp': firestore.SERVER_TIMESTAMP})
        test_ref.delete()
        print("   ✅ Connection successful!")
        
        # Upload all data
        upload_users()
        upload_transactions()
        upload_reminders()
        upload_translations()
        
        # Ask about stores (large dataset)
        print("\n" + "-" * 50)
        print("⚠️  Store data is large (80,000+ records)")
        response = input("Do you want to upload stores? (y/n): ").strip().lower()
        
        if response == 'y':
            upload_stores()
        else:
            print("   ⏭️  Skipped store upload")
        
        print("\n" + "=" * 50)
        print("✅ Migration completed successfully!")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
