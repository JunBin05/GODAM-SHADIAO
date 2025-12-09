import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from services.auto_translation_service import translate

# Flag to switch between Firebase and local JSON
USE_FIREBASE = True

def load_reminders() -> Dict:
    """Load reminders - from Firebase or local JSON"""
    if USE_FIREBASE:
        try:
            from services.firebase_service import get_db
            db = get_db()
            reminders = {}
            for doc in db.collection('reminders').stream():
                data = doc.to_dict()
                reminders[doc.id] = data.get('reminders', [])
            return reminders
        except Exception as e:
            print(f"Error loading reminders from Firebase: {e}")
            # Fall back to local JSON
            pass
    
    # Load from local JSON
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(current_dir, '..', 'data', 'mock_aid_data.json')
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('reminders', {})
    except Exception as e:
        print(f"Error loading reminders: {e}")
        return {}


def get_user_reminders(user_id: str, lang: str = "en", include_past: bool = False) -> List[Dict]:
    """
    Get reminders for a specific user.
    
    Args:
        user_id: User identifier
        lang: Language code ("en" or "ms")
        include_past: Whether to include past reminders (default: only future + last 7 days)
    
    Returns:
        List of reminder dictionaries
    """
    all_reminders = load_reminders()
    user_reminders_raw = all_reminders.get(user_id, [])
    
    # Normalize reminder format
    normalized_reminders = []
    for idx, reminder in enumerate(user_reminders_raw):
        normalized = {
            "reminder_id": f"REM{user_id}{idx:03d}",
            "user_id": user_id,
            "type": "payment_deadline" if "payment" in reminder.get('title', '').lower() else "credit_expiry",
            "title": reminder.get('title', 'Reminder'),
            "message": reminder.get('description', ''),
            "program_id": reminder.get('program_id'),
            "date": reminder.get('due_date', datetime.now().isoformat()) + "T00:00:00Z",
            "is_read": False,
            "priority": reminder.get('priority', 'normal')
        }
        normalized_reminders.append(normalized)
    
    user_reminders = normalized_reminders
    
    # Filter by date if not including all past reminders
    if not include_past:
        cutoff_date = datetime.now() - timedelta(days=7)
        filtered_reminders = []
        
        for reminder in user_reminders:
            try:
                reminder_date = datetime.fromisoformat(reminder['date'].replace('Z', '+00:00'))
                if reminder_date >= cutoff_date:
                    filtered_reminders.append(reminder)
            except:
                # If date parsing fails, include the reminder
                filtered_reminders.append(reminder)
        
        user_reminders = filtered_reminders
    
    # Sort by date (newest first)
    user_reminders.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    # Translate reminders using hybrid approach (manual + Google Translate)
    if lang != "en":
        for reminder in user_reminders:
            # Translate title and message using hybrid service
            # This will use manual translations for common terms,
            # and fall back to Google Translate for dynamic content
            reminder['title'] = translate(reminder['title'], lang)
            reminder['message'] = translate(reminder['message'], lang)
    
    return user_reminders


def get_unread_count(user_id: str) -> int:
    """Get count of unread reminders for a user"""
    all_reminders = load_reminders()
    user_reminders = all_reminders.get(user_id, [])
    
    unread = sum(1 for r in user_reminders if not r.get('is_read', False))
    return unread


def mark_reminder_as_read(user_id: str, reminder_id: str) -> bool:
    """
    Mark a reminder as read (in production, this would update the database).
    
    Args:
        user_id: User identifier
        reminder_id: Reminder identifier
    
    Returns:
        True if successful, False otherwise
    """
    # In a real system, this would update the database
    # For now, we'll just return True as a mock
    return True


def create_payment_reminder(user_id: str, program_id: str, amount: float, date: str) -> Dict:
    """
    Create a payment reminder for a user.
    
    Args:
        user_id: User identifier
        program_id: Aid program ID
        amount: Payment amount
        date: Payment date (ISO format)
    
    Returns:
        Reminder dictionary
    """
    import random
    reminder_id = f"REM{random.randint(1000, 9999)}"
    
    return {
        "reminder_id": reminder_id,
        "user_id": user_id,
        "type": "payment_deadline",
        "title": f"{program_id.upper()} Payment Available",
        "message": f"Your {program_id.upper()} payment of RM{amount:.2f} is now available",
        "program_id": program_id,
        "date": date,
        "is_read": False,
        "priority": "high"
    }


def create_credit_expiry_reminder(user_id: str, program_id: str, balance: float, expiry_date: str) -> Dict:
    """
    Create a credit expiry reminder.
    
    Args:
        user_id: User identifier
        program_id: Aid program ID
        balance: Remaining balance
        expiry_date: Expiry date (ISO format)
    
    Returns:
        Reminder dictionary
    """
    import random
    reminder_id = f"REM{random.randint(1000, 9999)}"
    
    return {
        "reminder_id": reminder_id,
        "user_id": user_id,
        "type": "credit_expiry",
        "title": f"{program_id.upper()} Credit Expiring Soon",
        "message": f"Your {program_id.upper()} balance of RM{balance:.2f} will expire on {expiry_date}",
        "program_id": program_id,
        "date": expiry_date,
        "is_read": False,
        "priority": "high"
    }
