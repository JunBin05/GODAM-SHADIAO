"""
Quick STR Application Test - Single Scenario
"""
import requests
import json

response = requests.post(
    "http://localhost:8000/api/str-application/prepare-application",
    params={"lang": "en"},
    json={
        "applicant": {
            "ic_number": "950615105432",
            "name": "Ahmad bin Abdullah",
            "age": 30,
            "gender": "Male",
            "phone_home": "03-12345678",
            "phone_mobile": "0123456789",
            "occupation": "employed",
            "household_monthly_income": 1800.0,
            "marital_status": "single",
            "marital_date": None,
            "address": "No. 45, Jalan Bahagia, Taman Sejahtera",
            "postcode": "43000",
            "city": "Kajang",
            "state": "Selangor",
            "bank_name": "Maybank",
            "bank_account": "123456789012",
            "email": "ahmad@email.com"
        },
        "spouse": None,
        "children": [],
        "guardian": {
            "relationship": "parent",
            "id_type": "mykad",
            "id_number": "650101015678",
            "name": "Abdullah bin Hassan",
            "phone_mobile": "0198765432",
            "same_as_spouse": False
        }
    }
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print("\n" + "="*60)
    print("✅ STR APPLICATION TEST SUCCESSFUL!")
    print("="*60)
    print(f"Eligible: {data.get('eligibility_result', {}).get('eligible')}")
    print(f"Amount: RM{data.get('estimated_amount', 0):.2f}/month")
    print(f"Documents needed: {len(data.get('required_documents', []))}")
    print(f"Next steps: {len(data.get('next_steps', []))}")
else:
    print(f"Error: {response.text[:1000]}")
