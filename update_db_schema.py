"""
Script to add missing family fields to MongoDB users collection
"""
from dotenv import load_dotenv
load_dotenv('.env')
load_dotenv('backend/.env')

from backend.services.mongodb_service import get_db

db = get_db()

print('Adding missing fields to users...')

# Default values for new fields
default_updates = {
    'marital_status': 'single',
    'spouse': {'name': '', 'ic_number': ''},
    'children': [],
    'guardian': {'name': '', 'relationship': '', 'phone': ''}
}

# Update all users to have these fields if missing
result = db.users.update_many(
    {'marital_status': {'$exists': False}},
    {'$set': default_updates}
)
print(f'Updated {result.modified_count} users with default fields')

# Add sample data to first 3 users for testing
sample_users = [
    {
        'ic': '630918-12-2345',
        'marital_status': 'married',
        'spouse': {'name': 'Abdul Rahman bin Hassan', 'ic_number': '640520-12-1234'},
        'children': [
            {'name': 'Ahmad bin Abdul Rahman', 'ic_number': '900315-12-5678'},
            {'name': 'Siti binti Abdul Rahman', 'ic_number': '920720-12-9012'}
        ],
        'guardian': {'name': 'Aminah binti Yusof', 'relationship': 'Sister', 'phone': '012-3456789'}
    },
    {
        'ic': '640925-05-1234',
        'marital_status': 'married', 
        'spouse': {'name': 'Lakshmi a/p Subramaniam', 'ic_number': '650110-05-5678'},
        'children': [
            {'name': 'Raj a/l Kumar', 'ic_number': '950615-05-1234'}
        ],
        'guardian': {'name': 'Muthu a/l Raj', 'relationship': 'Brother', 'phone': '019-8765432'}
    },
    {
        'ic': '650315-10-1234',
        'marital_status': 'married',
        'spouse': {'name': 'Nor Azizah binti Mohd', 'ic_number': '660420-10-2345'},
        'children': [
            {'name': 'Muhammad bin Ahmad', 'ic_number': '980101-10-3456'},
            {'name': 'Nurul binti Ahmad', 'ic_number': '000515-10-4567'}
        ],
        'guardian': {'name': 'Hassan bin Abdullah', 'relationship': 'Father', 'phone': '013-1234567'}
    }
]

for user_data in sample_users:
    ic = user_data.pop('ic')
    result = db.users.update_one(
        {'_id': ic},
        {'$set': user_data}
    )
    if result.modified_count > 0:
        print(f'  Updated user {ic} with family data')
    else:
        print(f'  User {ic} not found or already updated')

# Verify the updates
print('\n=== VERIFICATION ===')
user = db.users.find_one({'_id': '630918-12-2345'})
if user:
    print(f"Name: {user.get('name')}")
    print(f"Marital Status: {user.get('marital_status')}")
    print(f"Spouse: {user.get('spouse')}")
    print(f"Children: {user.get('children')}")
    print(f"Guardian: {user.get('guardian')}")

print('\n✅ Database schema updated successfully!')
