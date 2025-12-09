import json
import os
from typing import Dict, Optional

# Flag to switch between Firebase and local JSON
USE_FIREBASE = True

def load_translations() -> Dict:
    """Load translations - from Firebase or local JSON"""
    if USE_FIREBASE:
        try:
            from services.firebase_service import get_translations
            return get_translations()
        except Exception as e:
            print(f"Error loading translations from Firebase: {e}")
            # Fall back to local JSON
            pass
    
    # Load from local JSON
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(current_dir, '..', 'data', 'translations.json')
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading translations: {e}")
        return {}


def translate(key: str, lang: str = "en", **kwargs) -> str:
    """
    Translate a key to the specified language.
    
    Args:
        key: Translation key (e.g., "program_names.str", "messages.success")
        lang: Language code ("en", "ms", "zh", "ta")
        **kwargs: Variables to substitute in the translation string
    
    Returns:
        Translated string
    """
    translations = load_translations()
    
    # Default to English if language not supported
    if lang not in ["en", "ms", "zh", "ta"]:
        lang = "en"
    
    # Navigate through nested keys
    keys = key.split(".")
    value = translations
    
    try:
        for k in keys:
            value = value[k]
        
        # Get the translation for the specified language
        if isinstance(value, dict) and lang in value:
            result = value[lang]
        else:
            result = value
        
        # Substitute variables if provided
        if kwargs:
            result = result.format(**kwargs)
        
        return result
        
    except (KeyError, TypeError):
        # Return the key itself if translation not found
        return key


def get_program_name(program_id: str, lang: str = "en") -> str:
    """Get program name in specified language"""
    return translate(f"program_names.{program_id}", lang)


def get_message(message_key: str, lang: str = "en", **kwargs) -> str:
    """Get message in specified language with variable substitution"""
    return translate(f"messages.{message_key}", lang, **kwargs)


def get_error_message(error_key: str, lang: str = "en", **kwargs) -> str:
    """Get error message in specified language"""
    return translate(f"errors.{error_key}", lang, **kwargs)


def translate_reminder(reminder: Dict, lang: str = "en") -> Dict:
    """
    Translate reminder fields to specified language.
    
    Args:
        reminder: Reminder dictionary
        lang: Language code
    
    Returns:
        Translated reminder dictionary
    """
    translated = reminder.copy()
    
    # Translate title and message if they have translation keys
    reminder_type = reminder.get('type', '')
    
    if reminder_type:
        title_key = f"reminder_titles.{reminder_type}"
        message_key = f"reminder_messages.{reminder_type}"
        
        translated['title'] = translate(title_key, lang, **reminder)
        translated['message'] = translate(message_key, lang, **reminder)
    
    return translated
