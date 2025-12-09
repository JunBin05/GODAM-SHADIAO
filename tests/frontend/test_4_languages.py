import requests
import json

print("\n=== TESTING ALL 4 LANGUAGES ===\n")

languages = {
    "en": "ENGLISH",
    "ms": "MALAY", 
    "ta": "TAMIL",
    "zh": "CHINESE"
}

for lang_code, lang_name in languages.items():
    print(f"=== {lang_name} ({lang_code}) ===")
    try:
        response = requests.get(f"http://127.0.0.1:8000/api/reminders/USR001?lang={lang_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Status: {response.status_code}")
            print(f"✓ Message: {data.get('message')}")
            print(f"✓ Reminders: {len(data.get('data', []))}")
            if data.get('data'):
                reminder = data['data'][0]
                print(f"✓ First reminder title: {reminder.get('title')}")
                print(f"✓ First reminder message: {reminder.get('message')[:50]}...")
        else:
            print(f"✗ Error: Status {response.status_code}")
            print(f"✗ Response: {response.text}")
    except Exception as e:
        print(f"✗ Error: {str(e)}")
    print()
