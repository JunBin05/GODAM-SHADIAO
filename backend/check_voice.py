from services.mongodb_service import get_db

db = get_db()
users = list(db.users.find({}).sort('_id', -1).limit(5))

print("\n=== Latest 5 registered users ===")
for u in users:
    voice_status = "✓ HAS VOICE" if u.get('voiceEmbedding') else "✗ NO VOICE"
    voice_len = len(u.get('voiceEmbedding', [])) if u.get('voiceEmbedding') else 0
    print(f"IC: {u['_id']}")
    print(f"  Name: {u.get('name')}")
    print(f"  Voice: {voice_status} ({voice_len} elements)")
    print()
