"""
Test MongoDB Atlas connection
"""
from services.mongodb_service import get_db

try:
    print("Testing MongoDB Atlas connection...")
    db = get_db()
    
    # Test collections
    collections = db.list_collection_names()
    print(f"\n✓ Connected to database: {db.name}")
    print(f"✓ Collections found: {len(collections)}")
    
    if collections:
        print("\nCollections:")
        for coll in collections:
            count = db[coll].count_documents({})
            print(f"  - {coll}: {count} documents")
    else:
        print("\nNo collections yet. Run migration script to populate data.")
    
    print("\n✅ MongoDB connection successful!")
    
except Exception as e:
    print(f"\n❌ Error connecting to MongoDB:")
    print(f"   {str(e)}")
    print("\nPlease check:")
    print("1. MongoDB URI in .env file is correct")
    print("2. MongoDB Atlas cluster is running")
    print("3. IP address is whitelisted in MongoDB Atlas")
    print("4. Username and password are correct")
