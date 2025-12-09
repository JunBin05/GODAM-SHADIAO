"""
Authentication service - handles user authentication logic
"""
import json
import os
from typing import Optional, Dict

# Load mock users data
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
USERS_FILE = os.path.join(DATA_DIR, 'mock_users.json')

def load_users() -> list:
    """Load users from mock data file"""
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data['users']


def authenticate_by_pin(user_id: str, pin: str) -> Optional[Dict]:
    """
    Authenticate user by PIN
    
    Args:
        user_id: User ID
        pin: 6-digit PIN
    
    Returns:
        User dict if authenticated, None if failed
    """
    users = load_users()
    
    for user in users:
        if user['user_id'] == user_id and user['pin'] == pin:
            return user
    
    return None


def authenticate_by_face(face_id: str) -> Optional[Dict]:
    """
    Authenticate user by face embedding (mock implementation)
    
    Args:
        face_id: Face embedding or face_id
    
    Returns:
        User dict if authenticated, None if failed
    """
    users = load_users()
    
    # Mock: Simple string matching for hackathon
    # In production, this would compare embeddings with similarity threshold
    for user in users:
        if user['face_embedding'] == face_id:
            return user
    
    return None


def authenticate_by_voice(voice_id: str) -> Optional[Dict]:
    """
    Authenticate user by voice embedding (mock implementation)
    
    Args:
        voice_id: Voice embedding or voice_id
    
    Returns:
        User dict if authenticated, None if failed
    """
    users = load_users()
    
    # Mock: Simple string matching for hackathon
    # In production, this would compare voice embeddings with similarity threshold
    for user in users:
        if user['voice_embedding'] == voice_id:
            return user
    
    return None


def check_ic_exists(ic: str) -> bool:
    """
    Check if IC number already exists in system
    
    Args:
        ic: IC number
    
    Returns:
        True if exists, False otherwise
    """
    users = load_users()
    return any(user['ic'] == ic for user in users)


def validate_ic_format(ic: str) -> bool:
    """
    Validate IC number format (YYMMDD-PB-###G)
    
    Args:
        ic: IC number
    
    Returns:
        True if valid format, False otherwise
    """
    # Basic validation: should have 2 dashes and be around 14 characters
    parts = ic.split('-')
    if len(parts) != 3:
        return False
    
    # First part should be 6 digits (YYMMDD)
    if not parts[0].isdigit() or len(parts[0]) != 6:
        return False
    
    # Second part should be 2 digits (PB - place of birth)
    if not parts[1].isdigit() or len(parts[1]) != 2:
        return False
    
    # Third part should be 4 characters (###G)
    if len(parts[2]) != 4:
        return False
    
    return True


def create_new_user(user_data: dict) -> Dict:
    """
    Create a new user in the system
    
    Args:
        user_data: Dictionary containing user registration data
    
    Returns:
        Created user dictionary with generated user_id
    """
    users = load_users()
    
    # Generate new user_id
    max_user_num = 0
    for user in users:
        user_num = int(user['user_id'].replace('USR', ''))
        max_user_num = max(max_user_num, user_num)
    
    new_user_id = f"USR{str(max_user_num + 1).zfill(3)}"
    
    # Create new user object
    new_user = {
        "user_id": new_user_id,
        "name": user_data['name'],
        "ic": user_data['ic'],
        "age": calculate_age_from_ic(user_data['ic']),
        "phone": user_data['phone'],
        "email": user_data['email'],
        "monthly_income": user_data['monthly_income'],
        "household_size": user_data['household_size'],
        "state": user_data['state'],
        "disability_status": user_data['disability_status'],
        "employment_status": user_data['employment_status'],
        "dependents": user_data['dependents'],
        "pin": user_data['pin'],
        "face_embedding": f"face_embed_{new_user_id.lower()}_mock" if user_data.get('face_image') else None,
        "voice_embedding": f"voice_embed_{new_user_id.lower()}_mock" if user_data.get('voice_sample') else None,
        "preferred_language": user_data.get('preferred_language', 'ms'),
        "enrolled_programs": [],
        "created_date": user_data.get('created_date', '2024-12-07')
    }
    
    # Note: In a real system, this would save to database
    # For hackathon, we're just returning the object
    # You could append to the JSON file if needed
    
    return new_user


def calculate_age_from_ic(ic: str) -> int:
    """
    Calculate age from IC number
    
    Args:
        ic: IC number in format YYMMDD-PB-###G
    
    Returns:
        Calculated age
    """
    year_prefix = ic[:2]
    year = int(year_prefix)
    
    # Determine century (00-25 = 2000s, 26-99 = 1900s)
    if year <= 25:
        birth_year = 2000 + year
    else:
        birth_year = 1900 + year
    
    current_year = 2024
    age = current_year - birth_year
    
    return age
