"""
Hybrid Translation Service: Manual translations from Firebase
Uses manual translations from Firebase translations collection as primary source.
"""

import json
import os
from typing import Dict, Optional
from functools import lru_cache

# Google Translate is optional - we primarily use Firebase translations
GOOGLE_TRANSLATE_AVAILABLE = False
try:
    from googletrans import Translator
    GOOGLE_TRANSLATE_AVAILABLE = True
except ImportError:
    pass  # Will use Firebase translations only


class HybridTranslationService:
    """
    Hybrid translation service with manual fallback to Google Translate.
    
    Priority:
    1. Manual translations from translations.json (highest quality)
    2. Google Translate (for dynamic content)
    3. Original English text (if translation fails)
    """
    
    def __init__(self):
        self.manual_translations = self._load_manual_translations()
        self.translator = Translator() if GOOGLE_TRANSLATE_AVAILABLE else None
        
        # Language codes mapping for Google Translate
        self.lang_codes = {
            'en': 'en',
            'ms': 'ms',  # Malay
            'zh': 'zh-cn',  # Simplified Chinese
            'ta': 'ta'  # Tamil
        }
    
    def _load_manual_translations(self) -> Dict:
        """Load manual translations from Firebase or local backup"""
        try:
            # Try Firebase first
            from services.firebase_service import get_translations
            translations = get_translations()
            if translations:
                return translations
        except Exception as e:
            print(f"⚠️  Error loading translations from Firebase: {e}")
        
        # Fallback to local backup file
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(current_dir, '..', 'backup_data', 'translations.json')
            with open(data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Error loading translations.json: {e}")
            return {}
    
    def get_manual_translation(self, section: str, key: str, lang: str) -> Optional[str]:
        """
        Get translation from manual translations.json
        
        Args:
            section: Section name (e.g., 'messages', 'eligibility')
            key: Translation key (e.g., 'success', 'not_enrolled_program')
            lang: Language code ('en', 'ms', 'zh', 'ta')
        
        Returns:
            Translated string or None if not found
        """
        try:
            return self.manual_translations.get(section, {}).get(key, {}).get(lang)
        except:
            return None
    
    @lru_cache(maxsize=1000)
    def auto_translate(self, text: str, target_lang: str) -> str:
        """
        Automatically translate text using Google Translate (cached).
        
        Args:
            text: Text to translate
            target_lang: Target language code ('en', 'ms', 'zh', 'ta')
        
        Returns:
            Translated text or original if translation fails
        """
        if not self.translator or target_lang == 'en':
            return text
        
        try:
            google_lang = self.lang_codes.get(target_lang, target_lang)
            result = self.translator.translate(text, dest=google_lang, src='en')
            return result.text
        except Exception as e:
            print(f"⚠️  Auto-translation failed for '{text}' to {target_lang}: {e}")
            return text
    
    def translate(self, text: str, lang: str, section: str = None, key: str = None) -> str:
        """
        Hybrid translation: Try manual first, then auto-translate if needed.
        
        Args:
            text: Text to translate (English)
            lang: Target language code ('en', 'ms', 'zh', 'ta')
            section: Optional section name for manual lookup
            key: Optional key name for manual lookup
        
        Returns:
            Translated text
        
        Examples:
            # With manual translation available
            translate("Operation successful", "ms", "messages", "success")
            # Returns: "Operasi berjaya" (from translations.json)
            
            # Without manual translation (dynamic content)
            translate("Your payment of RM50.00 is ready", "ms")
            # Returns: "Pembayaran anda sebanyak RM50.00 sudah siap" (Google Translate)
        """
        # If English, return as-is
        if lang == 'en':
            return text
        
        # Try manual translation first (highest quality)
        if section and key:
            manual = self.get_manual_translation(section, key, lang)
            if manual:
                return manual
        
        # Fallback to Google Translate for dynamic content
        return self.auto_translate(text, lang)
    
    def translate_with_placeholders(self, template: str, lang: str, 
                                   section: str = None, key: str = None, **kwargs) -> str:
        """
        Translate text with placeholders (e.g., "Hello {name}").
        
        Args:
            template: Template string with {placeholders}
            lang: Target language code
            section: Optional section for manual lookup
            key: Optional key for manual lookup
            **kwargs: Values to fill placeholders
        
        Returns:
            Translated and formatted text
        
        Example:
            translate_with_placeholders(
                "Your {program} balance is RM{amount}",
                "ms",
                program="STR",
                amount="150.00"
            )
            # Returns: "Baki STR anda ialah RM150.00"
        """
        # If English, just format and return
        if lang == 'en':
            return template.format(**kwargs)
        
        # For other languages, fill placeholders first, then translate
        # This preserves proper nouns and numbers
        try:
            filled_text = template.format(**kwargs)
        except KeyError:
            filled_text = template
        
        # Then translate the filled text
        return self.translate(filled_text, lang, section, key)


# Global instance
_translation_service = None

def get_translation_service() -> HybridTranslationService:
    """Get or create the global translation service instance"""
    global _translation_service
    if _translation_service is None:
        _translation_service = HybridTranslationService()
    return _translation_service


# Convenience functions
def translate(text: str, lang: str, section: str = None, key: str = None) -> str:
    """Convenience function for translation"""
    service = get_translation_service()
    return service.translate(text, lang, section, key)


def translate_message(key: str, lang: str) -> str:
    """Translate a message from the 'messages' section"""
    service = get_translation_service()
    # Try to get the English text from manual translations
    en_text = service.get_manual_translation('messages', key, 'en')
    if not en_text:
        en_text = key  # Fallback to key itself
    return service.translate(en_text, lang, 'messages', key)


def translate_dynamic(text: str, lang: str, **kwargs) -> str:
    """
    Translate dynamic content with placeholders.
    
    Example:
        translate_dynamic("Your payment of RM{amount} is ready", "ms", amount="50.00")
    """
    service = get_translation_service()
    return service.translate_with_placeholders(text, lang, **kwargs)
