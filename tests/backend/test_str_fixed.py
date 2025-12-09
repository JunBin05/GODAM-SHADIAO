"""
Test script for STR Application Helper API - FIXED VERSION
Tests different scenarios with correct model structure
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/str-application"

def print_response(title, response):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"Error: {response.text[:500]}...")
    print()

def test_application_info():
    """Test getting STR application info"""
    print("\n" + "="*60)
    print("TEST 1: STR Application Information (All Languages)")
    print("="*60)
    
    for lang in ["en", "ms"]:
        response = requests.get(f"{BASE_URL}/application-info", params={"lang": lang})
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"\n[{lang.upper()}]")
            print(f"Program: {data.get('program_name')}")
            print(f"Amount: {data.get('amount_range')}")
            print(f"Portal: {data.get('portal_url')}")

def test_single_applicant():
    """Test: Single applicant"""
    application_data = {
        "applicant": {
            "ic_number": "950615105432",
            "name": "Ahmad bin Abdullah",
            "age": 30,
            "gender": "Male",
            "phone_home": "03-12345678",
            "phone_mobile": "0123456789",
            "occupation": "employed",
            "household_monthly_income": 1800,
            "marital_status": "single",
            "marital_date": None,
            "address_mailing": "No. 45, Jalan Bahagia",
            "address_postcode": "43000",
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
    
    response = requests.post(
        f"{BASE_URL}/prepare-application",
        json=application_data,
        params={"lang": "en"}
    )
    print_response("TEST 2: Single Applicant", response)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Key Results:")
        print(f"  - Eligible: {data.get('eligibility_result', {}).get('eligible')}")
        print(f"  - Amount: RM{data.get('estimated_amount', 0):.2f}")
        print(f"  - Documents needed: {len(data.get('required_documents', []))}")

def test_married_with_children():
    """Test: Married with 2 children"""
    application_data = {
        "applicant": {
            "ic_number": "880312086543",
            "name": "Siti binti Hassan",
            "age": 37,
            "gender": "Female",
            "phone_home": "04-7654321",
            "phone_mobile": "0139876543",
            "occupation": "self_employed",
            "household_monthly_income": 2200,
            "marital_status": "married",
            "marital_date": "2010-05-20",
            "address_mailing": "Lot 123, Kampung Baru",
            "address_postcode": "08000",
            "bank_name": "CIMB Bank",
            "bank_account": "987654321098",
            "email": "siti.hassan@email.com"
        },
        "spouse": {
            "id_type": "mykad",
            "id_number": "870815015678",
            "name": "Mohd Farid bin Ahmad",
            "gender": "Male",
            "phone_mobile": "0192345678",
            "occupation": "employed",
            "bank_name": "CIMB Bank",
            "bank_account": "111222333444"
        },
        "children": [
            {
                "id_number": "120506120987",
                "name": "Nurul Aina",
                "age": 13,
                "status": "biological"
            },
            {
                "id_number": "150820151234",
                "name": "Muhammad Haziq",
                "age": 10,
                "status": "biological"
            }
        ],
        "guardian": {
            "relationship": "spouse",
            "id_type": "mykad",
            "id_number": "870815015678",
            "name": "Mohd Farid bin Ahmad",
            "phone_mobile": "0192345678",
            "same_as_spouse": True
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/prepare-application",
        json=application_data,
        params={"lang": "ms"}
    )
    print_response("TEST 3: Married with 2 Children (Malay)", response)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Hasil Utama:")
        print(f"  - Layak: {data.get('eligibility_result', {}).get('eligible')}")
        print(f"  - Jumlah: RM{data.get('estimated_amount', 0):.2f}")
        print(f"  - Dokumen: {len(data.get('required_documents', []))}")
        print(f"  - Langkah: {len(data.get('next_steps', []))}")

def test_divorced_with_child():
    """Test: Divorced with 1 child"""
    application_data = {
        "applicant": {
            "ic_number": "900425105678",
            "name": "Lee Mei Ling",
            "age": 35,
            "gender": "Female",
            "phone_home": "03-87654321",
            "phone_mobile": "0165432109",
            "occupation": "employed",
            "household_monthly_income": 1500,
            "marital_status": "divorced",
            "marital_date": "2015-03-10",
            "address_mailing": "Apartment 5B, Taman Seri Jaya",
            "address_postcode": "52100",
            "bank_name": "Public Bank",
            "bank_account": "555666777888",
            "email": "meiling90@email.com"
        },
        "spouse": None,
        "children": [
            {
                "id_number": "160830160123",
                "name": "Lee Xin Yi",
                "age": 9,
                "status": "biological"
            }
        ],
        "guardian": {
            "relationship": "parent",
            "id_type": "mykad",
            "id_number": "650310125432",
            "name": "Tan Siew Lan",
            "phone_mobile": "0128765432",
            "same_as_spouse": False
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/prepare-application",
        json=application_data,
        params={"lang": "zh"}
    )
    print_response("TEST 4: Divorced with 1 Child (Chinese)", response)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ 主要结果:")
        print(f"  - 符合资格: {data.get('eligibility_result', {}).get('eligible')}")
        print(f"  - 金额: RM{data.get('estimated_amount', 0):.2f}")
        print(f"  - 所需文件: {len(data.get('required_documents', []))}")

def test_validation():
    """Test validation with invalid IC"""
    invalid_data = {
        "applicant": {
            "ic_number": "12345",  # TOO SHORT
            "name": "Test User",
            "age": 30,
            "gender": "Male",
            "phone_home": "03-12345678",
            "phone_mobile": "0123456789",
            "occupation": "employed",
            "household_monthly_income": 2000,
            "marital_status": "married",  # MARRIED BUT NO SPOUSE
            "marital_date": "2015-01-01",
            "address_mailing": "Test Address",
            "address_postcode": "12345",
            "bank_name": "Test Bank",
            "bank_account": "123456789",
            "email": "test@email.com"
        },
        "spouse": None,  # SHOULD HAVE SPOUSE INFO
        "children": [],
        "guardian": {
            "relationship": "parent",
            "id_type": "mykad",
            "id_number": "600101015678",
            "name": "Test Guardian",
            "phone_mobile": "0123456789",
            "same_as_spouse": False
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/validate-data",
        json=invalid_data,
        params={"lang": "en"}
    )
    print_response("TEST 5: Validation Errors (Expected)", response)

if __name__ == "__main__":
    print("\n" + "="*60)
    print("STR APPLICATION HELPER - API TESTING (FIXED)")
    print("="*60)
    print("Server: http://localhost:8000")
    print()
    
    try:
        test_application_info()
        test_single_applicant()
        test_married_with_children()
        test_divorced_with_child()
        test_validation()
        
        print("\n" + "="*60)
        print("✅ TESTING COMPLETE!")
        print("="*60)
        print("\nVerify:")
        print("  ✓ Different marital statuses work")
        print("  ✓ Document checklists vary by status")
        print("  ✓ Eligibility amounts calculated correctly")
        print("  ✓ Multi-language responses working")
        print("  ✓ Validation catches errors")
        print()
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to server")
        print("Start server: .\\venv\\Scripts\\Activate.ps1; python -m uvicorn backend.main:app --reload")
