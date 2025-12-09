"""
Test script for STR Application Helper API
Tests different scenarios: single, married with children, divorced
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
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    else:
        print(f"Error: {response.text}")
    print()

def test_application_info():
    """Test getting STR application info in different languages"""
    print("\n" + "="*60)
    print("TEST 1: Get STR Application Information")
    print("="*60)
    
    for lang in ["en", "ms", "zh", "ta"]:
        response = requests.get(f"{BASE_URL}/application-info", params={"lang": lang})
        print(f"\n[{lang.upper()}] Application Info:")
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"  Program: {data.get('program_name', 'N/A')}")
            print(f"  Description: {data.get('description', 'N/A')[:100]}...")
            print(f"  Portal: {data.get('portal_url', 'N/A')}")
        print()

def test_single_applicant():
    """Test scenario: Single applicant, no children"""
    application_data = {
        "applicant": {
            "ic_number": "950615105432",
            "name": "Ahmad bin Abdullah",
            "gender": "Male",
            "date_of_birth": "1995-06-15",
            "home_phone": "03-12345678",
            "mobile_phone": "012-3456789",
            "occupation": "private_employee",
            "household_monthly_income": 1800,
            "marital_status": "single",
            "marital_date": None,
            "mailing_address": "No. 45, Jalan Bahagia, Taman Sejahtera",
            "postcode": "43000",
            "bank_name": "Maybank",
            "bank_account_number": "123456789012",
            "email": "ahmad@email.com"
        },
        "spouse_info": None,
        "children": [],
        "guardian_info": None
    }
    
    response = requests.post(
        f"{BASE_URL}/prepare-application",
        json=application_data,
        params={"lang": "en"}
    )
    print_response("TEST 2: Single Applicant (English)", response)

def test_married_with_children():
    """Test scenario: Married applicant with 2 children"""
    application_data = {
        "applicant_info": {
            "ic_number": "880312086543",
            "name": "Siti binti Hassan",
            "gender": "Female",
            "date_of_birth": "1988-03-12",
            "home_phone": "04-7654321",
            "mobile_phone": "013-9876543",
            "occupation": "self_employed",
            "household_monthly_income": 2200,
            "marital_status": "married",
            "marital_date": "2010-05-20",
            "mailing_address": "Lot 123, Kampung Baru, Taman Indah",
            "postcode": "08000",
            "bank_name": "CIMB Bank",
            "bank_account_number": "987654321098",
            "email": "siti.hassan@email.com"
        },
        "spouse_info": {
            "id_type": "mykad",
            "id_number": "870815015678",
            "name": "Mohd Farid bin Ahmad",
            "gender": "Male",
            "mobile_phone": "019-2345678",
            "occupation": "private_employee",
            "bank_account_number": "111222333444"
        },
        "children": [
            {
                "id_number": "120506120987",
                "name": "Nurul Aina binti Mohd Farid",
                "age": 13,
                "is_biological": True
            },
            {
                "id_number": "150820151234",
                "name": "Muhammad Haziq bin Mohd Farid",
                "age": 10,
                "is_biological": True
            }
        ],
        "guardian_info": None
    }
    
    # Test in Malay
    response = requests.post(
        f"{BASE_URL}/prepare-application",
        json=application_data,
        params={"lang": "ms"}
    )
    print_response("TEST 3: Married with 2 Children (Malay)", response)

def test_divorced_with_child():
    """Test scenario: Divorced applicant with 1 child"""
    application_data = {
        "applicant_info": {
            "ic_number": "900425105678",
            "name": "Lee Mei Ling",
            "gender": "Female",
            "date_of_birth": "1990-04-25",
            "home_phone": "03-87654321",
            "mobile_phone": "016-5432109",
            "occupation": "part_time_worker",
            "household_monthly_income": 1500,
            "marital_status": "divorced",
            "marital_date": "2015-03-10",
            "mailing_address": "Apartment 5B, Taman Seri Jaya",
            "postcode": "52100",
            "bank_name": "Public Bank",
            "bank_account_number": "555666777888",
            "email": "meiling90@email.com"
        },
        "spouse_info": None,
        "children": [
            {
                "id_number": "160830160123",
                "name": "Lee Xin Yi",
                "age": 9,
                "is_biological": True
            }
        ],
        "guardian_info": {
            "relationship": "mother",
            "same_as_spouse": False,
            "id_type": "mykad",
            "id_number": "650310125432",
            "name": "Tan Siew Lan",
            "mobile_phone": "012-8765432"
        }
    }
    
    # Test in Chinese
    response = requests.post(
        f"{BASE_URL}/prepare-application",
        json=application_data,
        params={"lang": "zh"}
    )
    print_response("TEST 4: Divorced with 1 Child (Chinese)", response)

def test_validation_errors():
    """Test data validation with incomplete/invalid data"""
    invalid_data = {
        "applicant_info": {
            "ic_number": "12345",  # Invalid IC (too short)
            "name": "Test User",
            "gender": "Male",
            "date_of_birth": "1990-01-01",
            "mobile_phone": "012-3456789",
            "occupation": "private_employee",
            "household_monthly_income": 2000,
            "marital_status": "married",  # Married but no spouse info
            "marital_date": "2015-01-01",
            "mailing_address": "Test Address",
            "postcode": "12345",
            "bank_name": "Test Bank",
            "bank_account_number": "123456789",
            "email": "test@email.com"
        },
        "spouse_info": None,  # Missing spouse info for married status
        "children": [],
        "guardian_info": None
    }
    
    response = requests.post(
        f"{BASE_URL}/validate-data",
        json=invalid_data,
        params={"lang": "en"}
    )
    print_response("TEST 5: Validation Errors", response)

def test_widowed_applicant():
    """Test scenario: Widowed applicant with 3 children"""
    application_data = {
        "applicant_info": {
            "ic_number": "850920045678",
            "name": "Rajeswari a/p Subramaniam",
            "gender": "Female",
            "date_of_birth": "1985-09-20",
            "home_phone": "05-3216549",
            "mobile_phone": "014-7896543",
            "occupation": "odd_job_worker",
            "household_monthly_income": 1200,
            "marital_status": "widowed",
            "marital_date": "2008-11-15",
            "mailing_address": "No. 78, Jalan Raya, Kampung Baru",
            "postcode": "31400",
            "bank_name": "RHB Bank",
            "bank_account_number": "999888777666",
            "email": "rajeswari85@email.com"
        },
        "spouse_info": None,
        "children": [
            {
                "id_number": "110205110987",
                "name": "Priya a/p Murugan",
                "age": 14,
                "is_biological": True
            },
            {
                "id_number": "130815130456",
                "name": "Dinesh a/l Murugan",
                "age": 12,
                "is_biological": True
            },
            {
                "id_number": "171110170789",
                "name": "Kavitha a/p Murugan",
                "age": 8,
                "is_biological": True
            }
        ],
        "guardian_info": {
            "relationship": "grandmother",
            "same_as_spouse": False,
            "id_type": "mykad",
            "id_number": "580430125678",
            "name": "Lakshmi a/p Ramasamy",
            "mobile_phone": "012-6543210"
        }
    }
    
    # Test in Tamil
    response = requests.post(
        f"{BASE_URL}/prepare-application",
        json=application_data,
        params={"lang": "ta"}
    )
    print_response("TEST 6: Widowed with 3 Children (Tamil)", response)

if __name__ == "__main__":
    print("\n" + "="*60)
    print("STR APPLICATION HELPER - API TESTING")
    print("="*60)
    print("Make sure the FastAPI server is running on http://localhost:8000")
    print()
    
    try:
        # Test 1: Application info in all languages
        test_application_info()
        
        # Test 2: Single applicant
        test_single_applicant()
        
        # Test 3: Married with children
        test_married_with_children()
        
        # Test 4: Divorced with child
        test_divorced_with_child()
        
        # Test 5: Validation errors
        test_validation_errors()
        
        # Test 6: Widowed with children
        test_widowed_applicant()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED")
        print("="*60)
        print("\nNext steps:")
        print("1. Review the responses above")
        print("2. Check that document checklists vary by marital status")
        print("3. Verify eligibility calculations match expectations")
        print("4. Confirm next steps appear in correct languages")
        print()
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to server")
        print("Please start the FastAPI server first:")
        print("  cd C:\\Users\\JON\\OneDrive\\Documents\\GODAM-SHADIAO\\backend")
        print("  py -3.12 -m uvicorn main:app --reload")
        print()
