"""
Configuration settings for MyID Voice Assistant Backend
"""

# JWT Settings
JWT_SECRET = "myid-voice-assistant-hackathon-2025-secret-key"
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24

# Program IDs
PROGRAM_IDS = ["str", "sara"]

# Program Names
PROGRAM_NAMES = {
    "str": {"en": "Sumbangan Tunai Rahmah", "ms": "Sumbangan Tunai Rahmah"},
    "sara": {"en": "SUMBANGAN ASAS RAHMAH (SARA)", "ms": "SUMBANGAN ASAS RAHMAH (SARA)"}
}

# QR Code Settings
QR_EXPIRY_MINUTES = 5

# API Response Messages
DEFAULT_LANG = "ms"
SUPPORTED_LANGUAGES = ["en", "ms"]

# Eligibility Thresholds (Based on official government sources 2025)
# STR 2025 Source: https://www.touchngo.com.my/blog/eligible-sumbangan-tunai-rahmah-str/
# SARA 2025 Source: https://www.sara.gov.my/
ELIGIBILITY_RULES = {
    "str": {
        # Household income RM0-RM2,500 or RM2,501-RM5,000
        "income_tiers": {
            "tier1": {"max": 2500, "amounts": {"0_child": 150, "1_2_child": 300, "3_4_child": 500, "5_plus_child": 650}},
            "tier2": {"min": 2501, "max": 5000, "amounts": {"0_child": 100, "1_2_child": 200, "3_4_child": 250, "5_plus_child": 300}}
        },
        "senior_citizen": {"min_age": 60, "max_income": 5000, "amount": 150},  # Living alone
        "single_oku": {"min_age": 21, "max_age": 59, "max_income": 2500, "amount": 100},  # Single individuals with disability
        "single_individual": {"min_age": 21, "max_age": 59, "max_income": 2500, "amount": 100},  # Single non-OKU
        "description": "Sumbangan Tunai Rahmah - Cash assistance for B40/M40 households, seniors, singles, and OKU"
    },
    "sara": {
        # All Malaysians 18+ get RM100 one-off (Aug-Dec 2025)
        # STR 2025 recipients from Miskin Tegar/eKasih: RM100 or RM50/month for 12 months (Jan-Dec 2025)
        # STR 2025 Household & Senior Citizens: Additional RM100 or RM50/month for 9 months (Apr-Dec 2025)
        "universal": {"min_age": 18, "one_off_amount": 100, "description": "One-off RM100 for all Malaysians 18+"},
        "str_recipients_poor": {"monthly_amount": 100, "months": 12, "description": "STR recipients from Miskin Tegar/eKasih"},
        "str_recipients_additional": {"monthly_amount": 100, "months": 9, "description": "Additional for STR Household & Senior Citizens"},
        "eligible_categories": ["rice", "eggs", "bread", "cooking_oil", "biscuits", "instant_noodles", "flour", 
                               "beverages", "seasonings", "canned_food", "hygiene_essentials", "medicines", 
                               "school_supplies", "household_cleaning"],
        "description": "Sumbangan Asas Rahmah - Cashless credit for 14 categories of basic necessities"
    },
}

# Face/Voice Recognition Thresholds
FACE_MATCH_THRESHOLD = 0.6
VOICE_MATCH_THRESHOLD = 0.7

# Google API Keys
# Replace with your actual API keys from Google Cloud Console
GOOGLE_MAPS_API_KEY = "AIzaSyDZQwC7JyMymdJFThu-lNBu45NjOBBqbIc"  # For Maps/Geocoding (optional - store locator works without it)
GOOGLE_TRANSLATE_API_KEY = ""  # Optional - currently using free googletrans library
