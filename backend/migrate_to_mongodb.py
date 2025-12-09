"""
Migration script: Firebase Firestore → MongoDB Atlas
Migrates all data from Firebase to MongoDB
Stores: Only Kuala Lumpur area to reduce data size
"""
import firebase_admin
from firebase_admin import credentials, firestore
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Firebase
try:
    firebase_admin.get_app()
except:
    cred = credentials.Certificate('../serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

firebase_db = firestore.client()

# Initialize MongoDB
mongo_uri = os.getenv('MONGODB_URI')
if not mongo_uri or mongo_uri == 'your_mongodb_atlas_connection_string_here':
    print("❌ ERROR: Please update MONGODB_URI in .env file with your MongoDB Atlas connection string")
    print("\nSteps to get MongoDB Atlas URI:")
    print("1. Go to https://www.mongodb.com/cloud/atlas")
    print("2. Create a free account")
    print("3. Create a new cluster (free tier M0)")
    print("4. Click 'Connect' → 'Connect your application'")
    print("5. Copy the connection string")
    print("6. Replace <password> with your database password")
    print("7. Paste it in backend/.env file")
    exit(1)

mongo_client = MongoClient(mongo_uri)
mongo_db = mongo_client['godam_shadiao']

print("="*60)
print("FIREBASE → MONGODB MIGRATION")
print("="*60)

# ============ MIGRATE USERS ============
print("\n📤 Migrating USERS collection...")
users = list(firebase_db.collection('users').stream())
migrated_users = 0

for user in users:
    user_data = user.to_dict()
    user_id = user.id
    
    # Use IC as _id
    doc = user_data.copy()
    doc['_id'] = user_id
    
    # Remove duplicate fields
    doc.pop('ic', None)
    
    try:
        mongo_db.users.insert_one(doc)
        migrated_users += 1
        print(f"  ✓ User: {user_id} ({doc.get('name', 'N/A')})")
    except Exception as e:
        if 'duplicate key error' in str(e):
            print(f"  ⚠ User {user_id} already exists, skipping...")
        else:
            print(f"  ✗ Error migrating user {user_id}: {e}")

print(f"\n✓ Migrated {migrated_users} users")


# ============ MIGRATE FINANCIAL AID ============
print("\n📤 Migrating FINANCIAL AID collection...")
financial_aid = list(firebase_db.collection('financialAid').stream())
migrated_aid = 0

for aid in financial_aid:
    aid_data = aid.to_dict()
    aid_id = aid.id
    
    doc = aid_data.copy()
    doc['_id'] = aid_id
    
    # Convert Firestore timestamps to ISO strings
    for key, value in doc.items():
        if hasattr(value, 'timestamp'):  # Firestore timestamp
            doc[key] = value.isoformat()
    
    try:
        mongo_db.financialAid.insert_one(doc)
        migrated_aid += 1
        print(f"  ✓ Aid: {aid_id} (STR: {doc.get('str_eligible')}, MyKasih: {doc.get('mykasih_eligible')})")
    except Exception as e:
        if 'duplicate key error' in str(e):
            print(f"  ⚠ Aid {aid_id} already exists, skipping...")
        else:
            print(f"  ✗ Error migrating aid {aid_id}: {e}")

print(f"\n✓ Migrated {migrated_aid} financial aid records")


# ============ MIGRATE STORES (KL AREA ONLY) ============
print("\n📤 Migrating STORES collection (Kuala Lumpur area only)...")
stores = list(firebase_db.collection('stores').stream())
migrated_stores = 0

# KL area boundaries (approximate)
KL_LAT_MIN = 3.0
KL_LAT_MAX = 3.3
KL_LNG_MIN = 101.5
KL_LNG_MAX = 101.8

for store in stores:
    store_data = store.to_dict()
    
    # Check if in KL area
    lat = store_data.get('lat') or store_data.get('latitude')
    lng = store_data.get('lng') or store_data.get('longitude')
    
    if lat and lng:
        if KL_LAT_MIN <= lat <= KL_LAT_MAX and KL_LNG_MIN <= lng <= KL_LNG_MAX:
            try:
                # Don't set custom _id for stores, let MongoDB generate ObjectId
                mongo_db.stores.insert_one(store_data)
                migrated_stores += 1
                print(f"  ✓ Store: {store_data.get('name', 'N/A')} ({lat}, {lng})")
            except Exception as e:
                print(f"  ✗ Error migrating store: {e}")
        else:
            print(f"  ⊗ Skipped (outside KL): {store_data.get('name', 'N/A')}")
    else:
        print(f"  ⚠ Skipped (no coordinates): {store_data.get('name', 'N/A')}")

print(f"\n✓ Migrated {migrated_stores} stores (KL area only)")


# ============ MIGRATE TRANSACTIONS ============
print("\n📤 Migrating TRANSACTIONS collection...")
transactions = list(firebase_db.collection('transactions').stream())
migrated_transactions = 0

for txn in transactions:
    txn_data = txn.to_dict()
    
    # Convert timestamps
    for key, value in txn_data.items():
        if hasattr(value, 'timestamp'):
            txn_data[key] = value.isoformat()
    
    try:
        mongo_db.transactions.insert_one(txn_data)
        migrated_transactions += 1
    except Exception as e:
        print(f"  ✗ Error migrating transaction: {e}")

print(f"✓ Migrated {migrated_transactions} transactions")


# ============ MIGRATE REMINDERS ============
print("\n📤 Migrating REMINDERS collection...")
reminders = list(firebase_db.collection('reminders').stream())
migrated_reminders = 0

for reminder in reminders:
    reminder_data = reminder.to_dict()
    
    # Convert timestamps
    for key, value in reminder_data.items():
        if hasattr(value, 'timestamp'):
            reminder_data[key] = value.isoformat()
    
    try:
        mongo_db.reminders.insert_one(reminder_data)
        migrated_reminders += 1
    except Exception as e:
        print(f"  ✗ Error migrating reminder: {e}")

print(f"✓ Migrated {migrated_reminders} reminders")


# ============ MIGRATE TRANSLATIONS ============
print("\n📤 Migrating TRANSLATIONS collection...")
translations = list(firebase_db.collection('translations').stream())
migrated_translations = 0

for trans in translations:
    trans_data = trans.to_dict()
    trans_id = trans.id
    
    doc = trans_data.copy()
    doc['_id'] = trans_id
    
    try:
        mongo_db.translations.insert_one(doc)
        migrated_translations += 1
        print(f"  ✓ Translation: {trans_id}")
    except Exception as e:
        if 'duplicate key error' in str(e):
            print(f"  ⚠ Translation {trans_id} already exists, skipping...")
        else:
            print(f"  ✗ Error migrating translation: {e}")

print(f"✓ Migrated {migrated_translations} translation documents")


# ============ SUMMARY ============
print("\n" + "="*60)
print("MIGRATION SUMMARY")
print("="*60)
print(f"Users:           {migrated_users}")
print(f"Financial Aid:   {migrated_aid}")
print(f"Stores (KL):     {migrated_stores}")
print(f"Transactions:    {migrated_transactions}")
print(f"Reminders:       {migrated_reminders}")
print(f"Translations:    {migrated_translations}")
print("="*60)
print("\n✅ Migration completed!")
print("\nNext steps:")
print("1. Update backend/.env with your MongoDB Atlas connection string")
print("2. Test the connection by running: python test_mongodb.py")
print("3. Restart your backend server")

# Close connections
mongo_client.close()
