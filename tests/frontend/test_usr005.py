import requests
import json

print("\n" + "="*60)
print("TESTING USR005 WITH 2 REMINDERS - ALL 4 LANGUAGES")
print("="*60)

languages = [
    ('English', 'en'),
    ('Malay', 'ms'),
    ('Tamil', 'ta'),
    ('Chinese', 'zh')
]

for name, code in languages:
    print(f"\n{'='*60}")
    print(f" {name.upper()} (lang={code})")
    print('='*60)
    
    try:
        response = requests.get(f"http://localhost:8000/api/reminders/USR005?lang={code}")
        data = response.json()
        
        print(f"Message: {data.get('message')}")
        print(f"Unread Count: {data.get('unread_count')}")
        
        for idx, reminder in enumerate(data.get('data', []), 1):
            print(f"\n  {idx}. {reminder.get('title')}")
            print(f"     {reminder.get('message')[:80]}...")
            
    except Exception as e:
        print(f"ERROR: {e}")

print(f"\n{'='*60}\n")
