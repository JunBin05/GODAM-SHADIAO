from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv('MONGODB_URI'))
db = client['godam_shadiao']

print("=" * 60)
print("All users and their preferred languages:")
print("=" * 60)

users = list(db.users.find({}, {'_id': 1, 'name': 1, 'preferred_language': 1}))
for u in users:
    lang = u.get('preferred_language', 'NOT SET')
    print(f"  IC: {u['_id']} | Name: {u.get('name', 'N/A')[:30]:30} | Language: {lang}")

print("\n" + "=" * 60)
print("Looking for 'Detected IC' or similar entries:")
print("=" * 60)
for u in users:
    if 'detect' in str(u['_id']).lower() or 'detect' in str(u.get('name', '')).lower():
        print(f"  Found: {u}")
