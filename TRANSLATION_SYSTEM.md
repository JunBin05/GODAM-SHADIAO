# Hybrid Translation System

## Overview

The MyID Voice Assistant backend uses a **hybrid translation approach** combining:
1. **Manual translations** (high-quality, pre-translated) for critical UI elements
2. **Google Translate** (automatic) for dynamic/user-generated content

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         HybridTranslationService                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Try Manual Translation (translations.json)   │  │
│  │    ✓ High quality, context-aware                │  │
│  │    ✓ Pre-verified by humans                     │  │
│  └──────────────────────────────────────────────────┘  │
│                      ↓ (if not found)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 2. Try Google Translate (automatic)             │  │
│  │    ✓ Fast, scalable                             │  │
│  │    ✓ Cached for performance                     │  │
│  └──────────────────────────────────────────────────┘  │
│                      ↓ (if fails)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 3. Fallback to English                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Manual Translations (`backend/data/translations.json`)

**Coverage**: 38 entries × 4 languages = 152 translations

**Sections**:
- `program_names`: STR, SARA, MyKasih
- `enrollment_status`: enrolled, not_enrolled, pending
- `messages`: success, errors, confirmations (10 entries)
- `eligibility`: eligible, not_eligible, requirements (6 entries)
- `fields`: name, IC number, income, etc. (8 entries)
- `reminder_types`: credit_expiry, payment_deadline, etc. (3 entries)
- `error_codes`: USER_NOT_FOUND, INVALID_IC, etc. (5 entries)

**Languages**: English (en), Malay (ms), Chinese (zh), Tamil (ta)

### 2. Auto-Translation Service (`backend/services/auto_translation_service.py`)

**Features**:
- Loads manual translations on startup
- Uses `googletrans` library (free, no API key needed)
- LRU cache for performance (1000 entries)
- Handles placeholders (`{name}`, `{amount}`, etc.)

**Key Functions**:
```python
# Simple translation
translate("Invalid IC number", "ms", "error_codes", "INVALID_IC")
# Returns: "Format nombor IC tidak sah" (manual)

# Dynamic content
translate("Your payment of RM50.00 is ready", "ms")
# Returns: "Pembayaran anda sebanyak RM50.00 sudah siap" (Google)

# With placeholders
translate_dynamic("Balance: RM{amount}", "zh", amount="150.00")
# Returns: "余额：RM150.00"
```

## Usage Examples

### Example 1: Error Messages (Manual)
```python
from backend.services.auto_translation_service import translate

# Manual translation (high quality)
error_msg = translate("User not found", "ta", "messages", "user_not_found")
# Result: "பயனர் கண்டுபிடிக்கப்படவில்லை"
```

### Example 2: Dynamic Content (Auto)
```python
# Auto-translation (Google Translate)
dynamic_msg = translate("Your application #12345 has been approved", "ms")
# Result: "Permohonan anda #12345 telah diluluskan"
```

### Example 3: Reminders (Hybrid)
```python
from backend.services.reminder_service import get_user_reminders

# Automatically uses hybrid translation
reminders = get_user_reminders("USR001", lang="zh")
# Titles and messages are translated using manual + auto approach
```

## Quality Comparison

### Manual Translation (Critical Terms)
✅ **Best for**: Program names, error codes, legal terms

| English | Malay (Manual) | Chinese (Manual) | Tamil (Manual) |
|---------|----------------|------------------|----------------|
| Invalid IC number format | Format nombor IC tidak sah | 身份证号码格式无效 | தவறான அடையாள அட்டை எண் வடிவமைப்பு |

### Google Translate (Dynamic Content)
✅ **Best for**: User messages, dates, transaction details

| English | Malay (Auto) | Chinese (Auto) | Tamil (Auto) |
|---------|--------------|----------------|--------------|
| Invalid IC number format | Format nombor IC yang tidak sah | IC 号码格式无效 | தவறான IC எண் வடிவம் |

**Observation**: Manual is more precise (e.g., "身份证号码" vs "IC 号码")

## Performance

- **Manual lookup**: O(1) - instant dictionary access
- **Auto-translate**: ~100-500ms first call, then cached
- **Cache size**: 1000 entries (LRU eviction)
- **Memory usage**: ~2MB for translations.json + cache

## Adding New Translations

### Adding Manual Translation
Edit `backend/data/translations.json`:
```json
{
  "messages": {
    "new_message": {
      "en": "New message",
      "ms": "Mesej baru",
      "zh": "新消息",
      "ta": "புதிய செய்தி"
    }
  }
}
```

### Using Auto-Translation
No changes needed - just call `translate()` without section/key:
```python
translate("Any new dynamic text here", "ms")
```

## Validation

Run validation script to check translations:
```bash
python validate_translations.py
```

Output:
```
✅ JSON syntax is VALID!
✅ All entries have complete translations (en, ms, zh, ta)
TOTAL TRANSLATION ENTRIES: 38
```

## Testing

### Test Manual Translations
```bash
python test_hybrid_translation.py
```

### Test API Endpoints
```bash
python test_languages.py
```

### Test Specific Language
```bash
curl "http://localhost:8000/api/reminders/USR001?lang=ta"
```

## Best Practices

1. **Use manual translations for**:
   - Program names (STR, SARA, MyKasih)
   - Error messages
   - UI labels
   - Legal/government terms

2. **Use auto-translation for**:
   - User-generated content
   - Transaction messages
   - Dynamic dates/times
   - One-off notifications

3. **Always specify section/key** when available:
   ```python
   # Good - uses manual translation
   translate("Success", "ms", "messages", "success")
   
   # Also works - falls back to auto
   translate("Success", "ms")
   ```

4. **Handle placeholders properly**:
   ```python
   # Fill placeholders first, then translate
   translate_dynamic("Balance: RM{amount}", "zh", amount="150.00")
   ```

## Dependencies

```bash
pip install googletrans==4.0.0-rc1
```

**Note**: Uses free googletrans library (no API key needed). For production with high volume, consider:
- Google Cloud Translation API (paid, more reliable)
- Azure Translator (paid)
- AWS Translate (paid)

## Troubleshooting

### Issue: Google Translate not working
**Solution**: Check internet connection, or use manual translations only:
```python
# Service degrades gracefully to English if Google Translate fails
```

### Issue: Translation quality poor
**Solution**: Add manual translation for that specific term in `translations.json`

### Issue: Cache too large
**Solution**: Adjust cache size in `auto_translation_service.py`:
```python
@lru_cache(maxsize=1000)  # Change this number
```

## Future Enhancements

- [ ] Add more manual translations (expand to 100+ entries)
- [ ] Implement translation review workflow
- [ ] Add language detection for user input
- [ ] Support additional languages (Indonesian, Hindi)
- [ ] Implement translation metrics/monitoring
- [ ] Add A/B testing for translation quality

## Summary

✅ **Hybrid approach gives best of both worlds**:
- High quality for critical terms (manual)
- Scalability for dynamic content (auto)
- Fallback to English (reliability)

✅ **Current status**:
- 38 manual entries fully translated
- Unlimited auto-translation via Google
- All 4 languages tested and working

✅ **Ready for hackathon demo**!
