"""
Test script for Hybrid Translation Service
Demonstrates manual translations + Google Translate fallback
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from services.auto_translation_service import (
    get_translation_service,
    translate,
    translate_message,
    translate_dynamic
)

print("\n" + "="*70)
print("HYBRID TRANSLATION SERVICE TEST")
print("="*70)

service = get_translation_service()

print(f"\n✅ Google Translate Available: {service.translator is not None}")
print(f"✅ Manual Translations Loaded: {len(service.manual_translations)} sections")

# Test 1: Manual translations (from translations.json)
print("\n" + "="*70)
print("TEST 1: MANUAL TRANSLATIONS (High Quality)")
print("="*70)

test_cases_manual = [
    ("Operation successful", "messages", "success"),
    ("User not found", "messages", "user_not_found"),
    ("You are eligible for this program", "eligibility", "eligible"),
]

for text, section, key in test_cases_manual:
    print(f"\nOriginal: {text}")
    print(f"  🇲🇾 Malay:   {service.translate(text, 'ms', section, key)}")
    print(f"  🇨🇳 Chinese: {service.translate(text, 'zh', section, key)}")
    print(f"  🇮🇳 Tamil:   {service.translate(text, 'ta', section, key)}")

# Test 2: Dynamic content (Google Translate fallback)
print("\n" + "="*70)
print("TEST 2: DYNAMIC CONTENT (Google Translate Auto)")
print("="*70)

dynamic_texts = [
    "Your payment of RM50.00 is now ready for collection",
    "Please visit the nearest SARA store to claim your credit",
    "Your application has been processed successfully"
]

for text in dynamic_texts:
    print(f"\nOriginal: {text}")
    if service.translator:
        print(f"  🇲🇾 Malay:   {service.auto_translate(text, 'ms')}")
        print(f"  🇨🇳 Chinese: {service.auto_translate(text, 'zh')}")
        print(f"  🇮🇳 Tamil:   {service.auto_translate(text, 'ta')}")
    else:
        print("  ⚠️  Google Translate not available - would return English")

# Test 3: Placeholders with translation
print("\n" + "="*70)
print("TEST 3: DYNAMIC TEMPLATES WITH PLACEHOLDERS")
print("="*70)

templates = [
    ("Your {program} balance is RM{amount}", {"program": "STR", "amount": "150.00"}),
    ("Next payment date: {date}", {"date": "Dec 15, 2024"}),
    ("{count} reminders pending", {"count": "3"}),
]

for template, kwargs in templates:
    print(f"\nTemplate: {template}")
    print(f"Values: {kwargs}")
    if service.translator:
        print(f"  🇲🇾 Malay:   {service.translate_with_placeholders(template, 'ms', **kwargs)}")
        print(f"  🇨🇳 Chinese: {service.translate_with_placeholders(template, 'zh', **kwargs)}")
        print(f"  🇮🇳 Tamil:   {service.translate_with_placeholders(template, 'ta', **kwargs)}")
    else:
        print("  ⚠️  Google Translate not available")

# Test 4: Comparison - Manual vs Auto
print("\n" + "="*70)
print("TEST 4: QUALITY COMPARISON (Manual vs Auto)")
print("="*70)

comparison_text = "Invalid IC number format"
print(f"\nText: {comparison_text}")
print("\nManual Translation (from translations.json):")
print(f"  🇲🇾 Malay:   {service.translate(comparison_text, 'ms', 'error_codes', 'INVALID_IC')}")
print(f"  🇨🇳 Chinese: {service.translate(comparison_text, 'zh', 'error_codes', 'INVALID_IC')}")
print(f"  🇮🇳 Tamil:   {service.translate(comparison_text, 'ta', 'error_codes', 'INVALID_IC')}")

if service.translator:
    print("\nGoogle Translate (automatic):")
    print(f"  🇲🇾 Malay:   {service.auto_translate(comparison_text, 'ms')}")
    print(f"  🇨🇳 Chinese: {service.auto_translate(comparison_text, 'zh')}")
    print(f"  🇮🇳 Tamil:   {service.auto_translate(comparison_text, 'ta')}")

# Summary
print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print("""
✅ Hybrid Approach Benefits:
  1. High-quality manual translations for critical terms
  2. Automatic translation for dynamic/user-generated content
  3. Fallback to English if translation fails
  4. Cached auto-translations for performance

📊 Translation Sources:
  - Manual (translations.json): 38 entries × 4 languages = 152 translations
  - Google Translate: Unlimited dynamic content
  
🎯 Best For:
  - Manual: Program names, error messages, UI labels
  - Auto: User messages, transaction details, dynamic dates
""")

print("="*70 + "\n")
