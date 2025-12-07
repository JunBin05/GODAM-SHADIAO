import requests
import json

languages = [
    ('English', 'en'),
    ('Malay', 'ms'),
    ('Tamil', 'ta'),
    ('Chinese', 'zh')
]

print("\n" + "="*60)
print("TESTING ALL 4 LANGUAGES FOR REMINDERS API")
print("="*60)

for name, code in languages:
    print(f"\n{'='*60}")
    print(f" {name.upper()} (lang={code})")
    print('='*60)
    
    try:
        response = requests.get(f"http://localhost:8000/api/reminders/USR001?lang={code}")
        data = response.json()
        
        print(f"Status: {response.status_code}")
        print(f"Success: {data.get('success')}")
        print(f"Message: {data.get('message')}")
        print(f"Unread Count: {data.get('unread_count')}")
        print(f"\nReminders ({len(data.get('data', []))}):")
        
        for idx, reminder in enumerate(data.get('data', []), 1):
            print(f"\n  {idx}. {reminder.get('title')}")
            print(f"     {reminder.get('message')}")
            print(f"     Type: {reminder.get('type')} | Priority: {reminder.get('priority')}")
            
    except Exception as e:
        print(f"ERROR: {e}")

print(f"\n{'='*60}\n")
