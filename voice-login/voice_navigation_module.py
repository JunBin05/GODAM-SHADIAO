"""
Voice Navigation Module - Functions Only (No Auto-Load)
Import this module without loading models automatically
"""

import google.generativeai as genai
import json
import time
import re
import subprocess
import os
import torch
import librosa
import numpy as np
import soundfile as sf
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
# Find .env in current dir or parent directories
env_path = Path(__file__).parent.parent / ".env"
if not env_path.exists():
    env_path = Path(".env")
load_dotenv(env_path)

# ==========================================
# CONFIGURATION
# ==========================================
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in .env file.")
# Show which key is being used (masked for security)
print(f"🔑 Using Gemini API key: {GOOGLE_API_KEY[:10]}...{GOOGLE_API_KEY[-4:]}")
genai.configure(api_key=GOOGLE_API_KEY)

# Frontend URL Configuration
FRONTEND_URL = "http://localhost:5174"

# Page navigation mappings
PAGE_ROUTES = {
    "str": "/str",
    "str_status": "/str",
    "str_balance": "/str",
    "str_apply": "/str-apply",
    "mykasih": "/sara",
    "sara": "/sara",
    "mykasih_balance": "/sara",
    "reminders": "/reminders",
    "main": "/main",
    "home": "/main",
    "qr": "/qr",  # Special route - frontend will handle as modal
    "qr_payment": "/qr",
    "payment": "/qr",
    "scan": "/qr",
}

# ==========================================
# GLOBAL STATE
# ==========================================
session_state = {
    "step": "IDLE",
    "temp_data": {},
    "last_action": None,
    "pending_navigation": None
}

# Model globals
whisper_model = None
processor = None
MODEL_ID = "mesolitica/malaysian-whisper-medium-v2"
SAMPLE_RATE = 16000
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

def load_whisper_model():
    """Load Whisper model - call this explicitly"""
    global whisper_model, processor
    
    if whisper_model is not None:
        print("✅ Whisper model already loaded")
        return True
    
    print("\n" + "="*70)
    print("🎙️  LOADING MALAYSIAN WHISPER MODEL")
    print("="*70)
    print(f"📦 Model: {MODEL_ID}")
    print(f"💻 Device: {device.upper()}")
    print(f"⏳ Loading... This may take 1-2 minutes on first run")
    print("   (Model will be cached for faster subsequent loads)")
    print("="*70)
    
    try:
        processor = AutoProcessor.from_pretrained(MODEL_ID)
        print("   ✓ Processor loaded")
        
        whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
            MODEL_ID,
            torch_dtype=torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True
        ).to(device)
        print("   ✓ Model loaded to device")
        
        print("\n" + "="*70)
        print("✅ WHISPER MODEL READY!")
        print("="*70)
        print("🎯 Now supports: Malaysian Malay, English, Chinese")
        print("💬 Can recognize: STR, MyKasih, SARA, Sumbangan Tunai, etc.")
        print("🚀 Voice navigation fully operational")
        print("="*70 + "\n")
        return True
    except Exception as e:
        print("\n" + "="*70)
        print("❌ FAILED TO LOAD WHISPER MODEL")
        print("="*70)
        print(f"Error: {e}")
        print("="*70 + "\n")
        return False

def reset_session():
    global session_state
    session_state = {
        "step": "IDLE",
        "temp_data": {},
        "last_action": None,
        "pending_navigation": None
    }

def call_gemini_safe(prompt, system_instruction=None, retries=3):
    """Tries Gemini with exponential backoff retry logic"""
    # Using Gemini 2.0 Flash (stable, 60 RPM vs 2.5's 15 RPM)
    model = genai.GenerativeModel("gemini-2.0-flash", system_instruction=system_instruction)
    
    for i in range(retries):
        try:
            # Initial wait before each attempt
            time.sleep(2)
            return model.generate_content(prompt).text.strip()
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "rate" in error_msg.lower():
                # Exponential backoff: 5s, 10s, 20s
                wait_time = 5 * (2 ** i)
                print(f"⚠️ Rate limit (429). Waiting {wait_time}s... (attempt {i+1}/{retries})")
                time.sleep(wait_time)
            else:
                print(f"❌ API Error: {e}")
                return ""
    
    print(f"❌ Failed after {retries} retries")
    return ""

def keyword_based_classification(text, step=None):
    """Fallback classification using multilingual keywords when Gemini fails
    Supports: Malay, English, Chinese (Mandarin/Cantonese), Tamil
    """
    lower_text = text.lower()
    
    # If we're waiting for confirmation (ASK_NAVIGATION, CONFIRM_IC_STEP), check yes/no FIRST
    if step in ["ASK_NAVIGATION", "CONFIRM_IC_STEP", "ASK_AMOUNT"]:
        # Yes keywords - Malay, English, Chinese, Tamil
        yes_keywords = [
            # English
            "yes", "ok", "okay", "sure", "yup", "yep", "alright",
            # Malay
            "ya", "boleh", "betul", "baik", "iya", "yaya", "setuju",
            # Chinese (Mandarin)
            "好", "是", "可以", "行", "对", "嗯", "要",
            # Chinese (Cantonese)
            "係", "得", "好啊", "冇問題",
            # Tamil
            "ஆமா", "சரி", "ஆம்"
        ]
        for keyword in yes_keywords:
            if keyword in lower_text.split() or keyword in text or lower_text.startswith(keyword):
                print(f"   🔑 Confirmation: '{keyword}' -> YES")
                return {"navigate_confirmed": True, "confirmation": True}
        
        # No keywords - Malay, English, Chinese, Tamil
        no_keywords = [
            # English
            "no", "nope", "cancel", "stop", "don't", "not",
            # Malay
            "tidak", "tak", "taknak", "jangan", "batal", "takmau",
            # Chinese (Mandarin)
            "不", "不要", "不用", "算了", "取消", "没有",
            # Chinese (Cantonese)
            "唔", "唔好", "唔要", "冇",
            # Tamil
            "இல்லை", "வேண்டாம்"
        ]
        for keyword in no_keywords:
            if keyword in lower_text.split() or keyword in text or lower_text.startswith(keyword):
                print(f"   🔑 Confirmation: '{keyword}' -> NO")
                return {"navigate_confirmed": False, "confirmation": False}
    
    # STR related keywords - Multilingual
    str_keywords = [
        # English
        "str", "check str", "str status", "str balance", "cash aid",
        # Malay
        "sumbangan", "tunai", "sumbangan tunai", "bantuan tunai", "cek str",
        # Chinese (Mandarin)
        "现金援助", "援助金", "查看STR", "检查STR",
        # Chinese (Cantonese)
        "現金援助", "睇STR",
        # Tamil
        "நிதி உதவி", "பணம் உதவி"
    ]
    for keyword in str_keywords:
        if keyword in lower_text or keyword in text:
            print(f"   🔑 Keyword match: '{keyword}' -> check_str_status")
            return {"action_id": "check_str_status"}
    
    # MyKasih/SARA related keywords - Multilingual (but not "terima kasih" / "thank you" / "谢谢")
    if "terima kasih" not in lower_text and "thank you" not in lower_text and "谢谢" not in text and "多謝" not in text:
        mykasih_keywords = [
            # English
            "mykasih", "my kasih", "sara", "balance", "grocery",
            # Malay
            "baki", "kasih", "baki sara",
            # Chinese (Mandarin)
            "余额", "查余额", "看余额", "我的余额",
            # Chinese (Cantonese)
            "餘額", "我嘅餘額",
            # Tamil
            "இருப்பு", "நிலுவை"
        ]
        for keyword in mykasih_keywords:
            if keyword in lower_text or keyword in text:
                print(f"   🔑 Keyword match: '{keyword}' -> check_mykasih_balance")
                return {"action_id": "check_mykasih_balance"}
    
    # Apply STR - Multilingual
    apply_keywords = [
        # English
        "apply", "register", "sign up", "application",
        # Malay
        "mohon", "daftar str", "permohonan", "nak mohon",
        # Chinese
        "申请", "申請", "我要申请",
        # Tamil
        "விண்ணப்பிக்க", "பதிவு"
    ]
    for keyword in apply_keywords:
        if keyword in lower_text or keyword in text:
            print(f"   🔑 Keyword match: '{keyword}' -> apply_str")
            return {"action_id": "apply_str"}
    
    # QR Payment / Scan - Multilingual
    qr_keywords = [
        # English
        "qr", "scan", "payment", "pay", "qr code",
        # Malay
        "bayar", "kod qr", "imbas", "pembayaran",
        # Chinese
        "二维码", "扫码", "付款", "支付", "扫一扫",
        # Cantonese
        "掃碼", "畀錢",
        # Tamil
        "கட்டணம்", "செலுத்து"
    ]
    for keyword in qr_keywords:
        if keyword in lower_text or keyword in text:
            print(f"   🔑 Keyword match: '{keyword}' -> open_qr")
            return {"action_id": "open_qr"}
    
    # Reminders - Multilingual
    reminder_keywords = [
        # English
        "reminder", "appointment", "schedule", "remind me",
        # Malay
        "peringatan", "temujanji", "jadual",
        # Chinese
        "提醒", "预约", "提醒我",
        # Cantonese
        "提醒", "約會",
        # Tamil
        "நினைவூட்டல்", "சந்திப்பு"
    ]
    for keyword in reminder_keywords:
        if keyword in lower_text or keyword in text:
            print(f"   🔑 Keyword match: '{keyword}' -> check_reminders")
            return {"action_id": "check_reminders"}
    
    # Home/Main - Multilingual
    home_keywords = [
        # English
        "home", "main", "back", "exit", "go back",
        # Malay
        "balik", "utama", "keluar", "kembali",
        # Chinese
        "主页", "回去", "返回", "首页",
        # Cantonese
        "主頁", "返去",
        # Tamil
        "முகப்பு", "திரும்பு"
    ]
    for keyword in home_keywords:
        if keyword in lower_text or keyword in text:
            print(f"   🔑 Keyword match: '{keyword}' -> go_home")
            return {"action_id": "go_home"}
    
    # Note: Yes/No confirmations are already handled at lines 163-188 for confirmation steps
    # No need for fallback here - if we reach this point, it's genuinely unknown
    
    return {"action_id": "unknown"}

def is_hallucination(text):
    """
    Detect if transcript is likely a Whisper hallucination.
    Returns tuple: (is_hallucinated: bool, valid_extracted_text: str)
    
    If hallucination detected, tries to extract valid content before the loop.
    """
    if not text:
        return (False, text)
    
    # 1. Check for repeated single characters (5+)
    # Catches: "RRRRRR" or "r r r r r r"
    if re.search(r'(.)\1{4,}', text):
        valid = extract_valid_before_hallucination(text)
        return (True, valid)
    
    # 2. Check for repeated letter-hyphen patterns
    # Catches: "R-R-R-R-R" or "S-T-R-R-R-R-R-R"
    if re.search(r'(.-){5,}', text):
        valid = extract_valid_before_hallucination(text)
        return (True, valid)
    
    # 3. Check for repeated .com or similar patterns
    # Catches: "STR.com.com.com.com" or "test.org.org.org"
    if re.search(r'(\.\w+){4,}', text):
        valid = extract_valid_before_hallucination(text)
        return (True, valid)
    
    # 4. Check for same sentence/phrase repeated 3+ times
    # Catches: "I don't know how to do it. I don't know how to do it. I don't know..."
    if re.search(r'([^.!?]{10,}[.!?])\s*\1{2,}', text, re.IGNORECASE):
        valid = extract_valid_before_hallucination(text)
        return (True, valid)
    
    # 5. Check for same word repeated 8+ times (raised from 5 to avoid false positives)
    # Catches: "str str str str str str str str"
    words = text.lower().split()
    if len(words) >= 8:
        word_counts = {}
        for word in words:
            if len(word) > 2:  # Skip short words like "I", "a", "to"
                word_counts[word] = word_counts.get(word, 0) + 1
                if word_counts[word] >= 8:
                    valid = extract_valid_before_hallucination(text)
                    return (True, valid)
    
    # 6. Check for very long transcripts with low character diversity
    # Whisper loops create 100+ char strings with few unique letters
    if len(text) > 200:  # Raised from 100 to avoid false positives
        text_clean = text.lower().replace('-', '').replace(' ', '').replace(',', '').replace('.', '')
        unique_chars = len(set(text_clean))
        if unique_chars < 8:  # Less than 8 unique letters in 200+ chars
            valid = extract_valid_before_hallucination(text)
            return (True, valid)
    
    return (False, text)

def extract_valid_before_hallucination(text):
    """
    Extract the valid part of transcript before hallucination loop starts.
    For example: "I want STR. I don't know. I don't know. I don't know..."
    Returns: "I want STR."
    """
    if not text:
        return ""
    
    # Look for a phrase that repeats 3+ times
    # Split by common sentence endings
    sentences = re.split(r'([.!?])', text)
    
    # Reconstruct sentences with their punctuation
    full_sentences = []
    i = 0
    while i < len(sentences):
        if i + 1 < len(sentences) and sentences[i+1] in '.!?':
            full_sentences.append(sentences[i].strip() + sentences[i+1])
            i += 2
        else:
            if sentences[i].strip():
                full_sentences.append(sentences[i].strip())
            i += 1
    
    # Find where repetition starts
    seen = {}
    valid_end_index = len(full_sentences)
    
    for idx, sentence in enumerate(full_sentences):
        normalized = sentence.lower().strip()
        if len(normalized) > 10:  # Only check substantial sentences
            if normalized in seen:
                seen[normalized] += 1
                if seen[normalized] >= 3:
                    # Found repetition - cut off here
                    valid_end_index = seen.get(f'{normalized}_first_idx', idx)
                    break
            else:
                seen[normalized] = 1
                seen[f'{normalized}_first_idx'] = idx
    
    # Return valid portion
    valid_text = ' '.join(full_sentences[:valid_end_index])
    return valid_text.strip()

def clean_transcription(text):
    """
    Clean transcription with SAFE normalization:
    1. Detect and extract valid content before hallucinations
    2. Remove hyphens/spaces between SINGLE UPPERCASE letters (S-P-R → SPR)
    3. Map common misrecognitions to correct program names
    4. Preserve existing program names (STR, SARA, MyKasih)
    """
    original_text = text
    
    # Step 0a: Extract short confirmations BEFORE hallucination check
    # Short words like "yes", "no", "ok" get hallucinated easily
    # If the transcript STARTS with a confirmation word, extract it even if rest is garbage
    short_confirmations = ['yes', 'no', 'ok', 'okay', 'ya', 'yup', 'nope', 'sure', 'confirm', 
                           'cancel', 'skip', 'next', 'back', 'help', 'stop', 'done', 'submit']
    text_lower = text.lower().strip()
    first_word = text_lower.split()[0] if text_lower.split() else ""
    
    # If starts with confirmation and total length is suspiciously long, extract just the confirmation
    if first_word in short_confirmations and len(text) > 50:
        print(f"   ✅ SHORT CONFIRMATION extracted: '{first_word}' (ignored hallucinated tail)")
        return first_word
    
    # Step 0b: Check for hallucination - now extracts valid content before the loop
    is_hallucinated, extracted_text = is_hallucination(text)
    if is_hallucinated:
        if extracted_text and len(extracted_text.strip()) > 5:
            # We salvaged some valid content before the hallucination
            print(f"   ⚠️ HALLUCINATION DETECTED - salvaged: '{extracted_text[:80]}...'")
            text = extracted_text  # Continue with the salvaged content
        else:
            # Nothing useful before the hallucination
            print(f"   🚨 HALLUCINATION DETECTED (no valid content): '{text[:50]}...'")
            return ""  # Return empty to trigger "didn't hear" response
    
    # Step 1: Normalize single-letter patterns with hyphens
    # "S-P-R" → "SPR", "S-T-R" → "STR", "M-Y" → "MY"
    # But preserve multi-char words like "STR", "SARA"
    text_cleaned = re.sub(r'\b([A-Z])-([A-Z])\b', r'\1\2', text)  # S-P-R → SPR (word boundaries)
    text_cleaned = re.sub(r'\b([A-Z]) ([A-Z])\b', r'\1\2', text_cleaned)  # S P R → SPR
    
    # Step 2: Apply to uppercase for pattern matching
    text_upper = text_cleaned.upper()
    
    # Step 3: Map common misrecognitions to correct names
    # CRITICAL: These are Malaysia's government program names - must be exact!
    replacements = {
        "SDR": "STR",        # Common speech recognition error
        "SPR": "STR",        # When user says "S-P-R" instead of "STR"
        "STRR": "STR",       # Double R
        "SSTR": "STR",       # Double S
        "SUMBANGAN TUNAI": "STR",  # Full name → acronym
    }
    
    result = text_cleaned
    for wrong, correct in replacements.items():
        if wrong in text_upper:
            # Case-insensitive replacement but preserve original case
            result = re.sub(re.escape(wrong), correct, result, flags=re.IGNORECASE)
    
    print(f"   🧹 Cleaned: '{original_text}' → '{result}'")
    return result

# MongoDB connection for voice navigation
def get_mongodb_connection():
    """Get MongoDB connection"""
    from pymongo import MongoClient
    mongo_uri = os.getenv('MONGODB_URI')
    if not mongo_uri:
        print("⚠️ MONGODB_URI not found, using mock data")
        return None
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
        db = client['godam_shadiao']
        return db
    except Exception as e:
        print(f"⚠️ MongoDB connection failed: {e}")
        return None

def get_profile_data(ic_number):
    """Fetch user profile from MongoDB"""
    db = get_mongodb_connection()
    if db is not None:
        user = db.users.find_one({"_id": ic_number})
        if user:
            # Map preferred_language to voice language code
            # Supports: ms=Malay, en=English, zh=Chinese (Mandarin), HK=Cantonese, ta=Tamil
            # HK users get Cantonese TTS (browser supports zh-HK)
            lang_map = {"ms": "BM", "en": "BI", "zh": "BC", "HK": "HK", "hk": "HK", "ta": "BI", "zh-HK": "HK"}
            user_lang = user.get("preferred_language", "ms")
            lang = lang_map.get(user_lang, "BM")
            print(f"   🌐 User {ic_number} preferred_language: {user_lang} -> voice lang: {lang}")
            return {
                "name": user.get("name", "User"),
                "language": lang,
                "ic": ic_number,
                "phone": user.get("phone", ""),
                "email": user.get("email", ""),
                "state": user.get("state", ""),
                "monthly_income": user.get("monthly_income", 0),
                "employment_status": user.get("employment_status", ""),
                "dependents": user.get("dependents", 0),
                "household_size": user.get("household_size", 1)
            }
    # Fallback mock data
    return {"name": "User", "language": "BM", "ic": ic_number}

def get_financial_aid_data(ic_number):
    """Fetch financial aid data from MongoDB"""
    db = get_mongodb_connection()
    if db is not None:
        aid = db.financialAid.find_one({"_id": ic_number})
        if aid:
            return {
                "str_eligible": aid.get("str_eligible", False),
                "str_nextPayAmount": aid.get("str_nextPayAmount", 0),
                "str_nextPayDate": aid.get("str_nextPayDate", ""),
                "str_remainingCycles": aid.get("str_remainingCycles", 0),
                "mykasih_balance_not_expire": aid.get("mykasih_balance_not_expire", 0),
                "mykasih_eligible": aid.get("mykasih_eligible", False),
                "mykasih_expire_date": aid.get("mykasih_expire_date", "")
            }
    # Fallback mock data
    return {"str_eligible": True, "str_nextPayAmount": 500, "mykasih_balance_not_expire": 50}

ACTION_MENU = [
    {"action_id": "check_str_status", "desc": "User asks about STR/Sumbangan Tunai status.", "navigate_to": "str"},
    {"action_id": "check_mykasih_balance", "desc": "User asks about MyKasih/SARA balance.", "navigate_to": "sara"},
    {"action_id": "apply_str", "desc": "User wants to apply for STR.", "navigate_to": "str_apply"},
    {"action_id": "check_reminders", "desc": "User asks about reminders or appointments.", "navigate_to": "reminders"},
    {"action_id": "go_home", "desc": "User wants to go to main page/home.", "navigate_to": "main"},
    {"action_id": "open_qr", "desc": "User wants to open QR code, scan QR, or make payment.", "navigate_to": "qr"},
    {"action_id": "initiate_add_rep", "desc": "User wants to AUTHORIZE someone (child/daughter) to use their ID/money.", "navigate_to": None},
    {"action_id": "unknown", "desc": "Unrelated topic.", "navigate_to": None}
]

def open_browser_page(page_key):
    """Open browser to specific frontend page"""
    import webbrowser
    
    route = PAGE_ROUTES.get(page_key)
    if not route:
        print(f"⚠️ Unknown page: {page_key}")
        return False
    
    url = f"{FRONTEND_URL}{route}"
    print(f"\n🌐 Opening browser to: {url}")
    
    try:
        webbrowser.open(url)
        return True
    except Exception as e:
        print(f"❌ Failed to open browser: {e}")
        return False

def ask_gemini_brain(user_text):
    global session_state
    step = session_state["step"]
    
    print(f"   🧠 Processing: '{user_text}' (step: {step})")

    if step == "IDLE":
        sys_prompt = f"""
You are a multilingual intent classifier for a Malaysian government aid assistant.
The user may speak in Malay, English, Chinese (Mandarin/Cantonese), or Tamil.
Map the user's text to ONE action_id from: {json.dumps(ACTION_MENU)}.

CLASSIFICATION RULES (understand all languages):

1. check_str_status - User asks about STR/cash aid status:
   - English: "check my STR", "STR status", "STR balance", "cash aid"
   - Malay: "cek STR saya", "status STR", "sumbangan tunai", "bantuan tunai"
   - Chinese: "查看STR", "我的援助金", "现金援助", "檢查STR"
   - Tamil: "STR நிலை", "பணம் உதவி"

2. check_mykasih_balance - User asks about MyKasih/SARA balance:
   - English: "check my balance", "MyKasih balance", "SARA balance"
   - Malay: "baki saya", "cek baki MyKasih", "baki SARA"
   - Chinese: "查余额", "我的余额", "看余额", "餘額"
   - Tamil: "இருப்பு", "நிலுவை"

3. apply_str - User wants to apply for STR:
   - English: "apply for STR", "register for aid", "sign up"
   - Malay: "mohon STR", "daftar STR", "permohonan bantuan"
   - Chinese: "申请STR", "我要申请", "申請援助"
   - Tamil: "விண்ணப்பிக்க", "பதிவு செய்"

4. check_reminders - User asks about reminders/appointments:
   - English: "reminders", "appointments", "my schedule"
   - Malay: "peringatan", "temujanji", "jadual saya"
   - Chinese: "提醒", "预约", "我的提醒"
   - Tamil: "நினைவூட்டல்", "சந்திப்பு"

5. go_home - User wants to go home/back:
   - English: "home", "go back", "main page", "exit"
   - Malay: "balik", "halaman utama", "keluar"
   - Chinese: "回去", "主页", "返回", "首頁"
   - Tamil: "முகப்பு", "திரும்பு"

6. open_qr - User wants QR code/payment:
   - English: "QR code", "scan", "payment", "pay"
   - Malay: "kod QR", "bayar", "imbas", "pembayaran"
   - Chinese: "二维码", "扫码", "付款", "畀錢"
   - Tamil: "கட்டணம்", "செலுத்து"

7. initiate_add_rep - User wants to authorize someone:
   - English: "authorize my child", "let my daughter use", "give access"
   - Malay: "benarkan anak", "guna wang saya", "beri kebenaran"
   - Chinese: "授权孩子", "让孩子使用"
   - Tamil: "அங்கீகரிக்க"

8. unknown - Not related to above topics

Output JSON ONLY: {{ "action_id": "..." }}
"""
    elif step == "ASK_IC":
        sys_prompt = """Extract IC number (12 digits only) from user text. 
User may speak in any language. Look for number sequences.
Output JSON: { "extracted_ic": "123456789012" }"""
    elif step == "CONFIRM_IC_STEP":
        sys_prompt = """Did the user confirm or deny?
YES in any language: Yes, Ya, Betul, OK, 好, 是, 對, 係, ஆமா, சரி
NO in any language: No, Tidak, Tak, Salah, 不, 不要, 唔, இல்லை
Output JSON: { "confirmation": true/false }"""
    elif step == "ASK_AMOUNT":
        sys_prompt = """Extract the amount/number from user text.
User may say numbers in any language or format.
Output JSON: { "extracted_amount": 100 }"""
    elif step == "ASK_NAVIGATION":
        sys_prompt = """Did the user confirm they want to navigate to the page?
YES in any language: Yes, Ya, OK, Boleh, 好, 是, 可以, 係, 得, ஆமா, சரி
NO in any language: No, Tidak, Taknak, Cancel, 不, 不要, 唔好, இல்லை
Output JSON: { "navigate_confirmed": true/false }"""
    else:
        sys_prompt = "Output JSON: {}"

    response_text = call_gemini_safe(user_text, system_instruction=sys_prompt)
    
    # If Gemini failed (empty response), use keyword fallback
    if not response_text:
        print("   ⚠️ Gemini failed, using keyword fallback")
        return keyword_based_classification(user_text, step)
    
    clean_json = response_text.replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(clean_json)
        print(f"   ✅ Gemini result: {result}")
        return result
    except:
        print(f"   ⚠️ JSON parse failed, using keyword fallback")
        return keyword_based_classification(user_text, step)

def run_agent_logic(user_text, user_ic="900101012345"):
    global session_state
    
    profile = get_profile_data(user_ic)
    lang = profile.get('language', 'BM')
    
    # Early return for empty or very short transcripts (saves Gemini API calls)
    if not user_text or len(user_text.strip()) < 2:
        empty_msg = {
            "BM": "Maaf, saya tidak dengar apa-apa. Sila cuba lagi.",
            "BI": "Sorry, I didn't hear anything. Please try again.",
            "BC": "抱歉，我没有听到任何声音。请再试一次。",
            "HK": "對唔住，我冇聽到嘢。請再試過。"
        }
        print("   ⚠️ Empty or too short transcript, skipping Gemini")
        return {
            "reply": empty_msg.get(lang, empty_msg["BM"]),
            "lang": lang,
            "continue_conversation": False
        }
    
    decision = ask_gemini_brain(user_text)
    step = session_state["step"]

    navigation_prompts = {
        "BM": {
            "ask": "Adakah anda mahu pergi ke halaman {page}?",
            "opening": "Membuka halaman {page}...",
            "cancelled": "Baiklah, tidak buka halaman.",
        },
        "BC": {
            "ask": "你要去{page}页面吗？",
            "opening": "正在打开{page}页面...",
            "cancelled": "好的，不打开页面。",
        },
        "BI": {
            "ask": "Would you like to go to the {page} page?",
            "opening": "Opening {page} page...",
            "cancelled": "Okay, not opening the page.",
        },
        "HK": {
            "ask": "你想去{page}頁面嗎？",
            "opening": "正在打開{page}頁面...",
            "cancelled": "好，唔開頁面。",
        }
    }

    page_names = {
        "str": {"BM": "STR", "BC": "STR", "BI": "STR", "HK": "STR"},
        "sara": {"BM": "MyKasih", "BC": "MyKasih", "BI": "MyKasih", "HK": "MyKasih"},
        "str_apply": {"BM": "Permohonan STR", "BC": "STR申请", "BI": "STR Application", "HK": "STR申請"},
        "reminders": {"BM": "Peringatan", "BC": "提醒", "BI": "Reminders", "HK": "提醒"},
        "main": {"BM": "Utama", "BC": "主页", "BI": "Home", "HK": "主頁"},
        "qr": {"BM": "Kod QR", "BC": "二维码", "BI": "QR Code", "HK": "QR碼"},
    }

    prompts = navigation_prompts.get(lang, navigation_prompts["BM"])

    if step == "ASK_NAVIGATION":
        navigate_confirmed = decision.get("navigate_confirmed", False)
        pending_page = session_state["pending_navigation"]
        
        if navigate_confirmed:
            page_name = page_names.get(pending_page, {}).get(lang, pending_page.upper())
            session_state["step"] = "IDLE"
            session_state["pending_navigation"] = None
            
            # Return navigate_to route for frontend to handle navigation
            route = PAGE_ROUTES.get(pending_page, "/")
            return {
                "reply": prompts["opening"].format(page=page_name),
                "lang": lang,
                "continue_conversation": False,
                "navigate_to": route  # Frontend will handle this
            }
        else:
            session_state["step"] = "IDLE"
            session_state["pending_navigation"] = None
            return {
                "reply": prompts["cancelled"],
                "lang": lang,
                "continue_conversation": False
            }

    if step == "IDLE":
        action = decision.get("action_id")
        action_info = next((a for a in ACTION_MENU if a["action_id"] == action), None)
        navigate_to = action_info.get("navigate_to") if action_info else None
        
        if action == "initiate_add_rep":
            session_state["step"] = "ASK_IC"
            ic_prompts = {
                "BM": "Boleh. Sila berikan nombor Kad Pengenalan anak anda?",
                "BI": "Sure. Please provide your child's IC number?",
                "BC": "好的。请提供您孩子的身份证号码？",
                "HK": "好。請畀你仔女嘅身份證號碼？"
            }
            return {"reply": ic_prompts.get(lang, ic_prompts["BM"]), "lang": lang, "continue_conversation": True}
        
        elif action == "check_str_status":
            aid_data = get_financial_aid_data(user_ic)
            if aid_data.get("str_eligible"):
                next_payment = aid_data.get("str_nextPayAmount", 200)
                str_success = {
                    "BM": f"Permohonan STR anda lulus. Bayaran seterusnya RM{next_payment}.",
                    "BI": f"Your STR application is approved. Next payment is RM{next_payment}.",
                    "BC": f"您的STR申请已批准。下次付款为RM{next_payment}。",
                    "HK": f"你嘅STR申請已批准。下次畀錢係RM{next_payment}。"
                }
                reply = str_success.get(lang, str_success["BM"])
            else:
                str_pending = {
                    "BM": "Permohonan STR anda masih dalam proses.",
                    "BI": "Your STR application is still being processed.",
                    "BC": "您的STR申请仍在处理中。",
                    "HK": "你嘅STR申請仲喺處理緊。"
                }
                reply = str_pending.get(lang, str_pending["BM"])
            
            if navigate_to:
                page_name = page_names.get(navigate_to, {}).get(lang, "STR")
                session_state["step"] = "ASK_NAVIGATION"
                session_state["pending_navigation"] = navigate_to
                reply += f" {prompts['ask'].format(page=page_name)}"
                return {"reply": reply, "lang": lang, "continue_conversation": True}
            
            return {"reply": reply, "lang": lang, "continue_conversation": False}
        
        elif action == "check_mykasih_balance":
            aid_data = get_financial_aid_data(user_ic)
            balance = aid_data.get("mykasih_balance_not_expire", 50)
            mykasih_balance = {
                "BM": f"Baki MyKasih anda tinggal RM{balance}.",
                "BI": f"Your MyKasih balance is RM{balance}.",
                "BC": f"您的MyKasih余额为RM{balance}。",
                "HK": f"你嘅MyKasih餘額係RM{balance}。"
            }
            reply = mykasih_balance.get(lang, mykasih_balance["BM"])
            
            if navigate_to:
                page_name = page_names.get(navigate_to, {}).get(lang, "MyKasih")
                session_state["step"] = "ASK_NAVIGATION"
                session_state["pending_navigation"] = navigate_to
                reply += f" {prompts['ask'].format(page=page_name)}"
                return {"reply": reply, "lang": lang, "continue_conversation": True}
            
            return {"reply": reply, "lang": lang, "continue_conversation": False}
        
        elif action in ["apply_str", "check_reminders", "go_home", "open_qr"]:
            if navigate_to:
                page_name = page_names.get(navigate_to, {}).get(lang, navigate_to.upper())
                session_state["step"] = "ASK_NAVIGATION"
                session_state["pending_navigation"] = navigate_to
                
                # Language-aware action messages
                action_messages = {
                    "apply_str": {
                        "BM": "Anda boleh mohon STR di halaman permohonan.",
                        "BI": "You can apply for STR on the application page.",
                        "BC": "你可以在申请页面申请STR。",
                        "HK": "你可以喺申請頁面申請STR。"
                    },
                    "check_reminders": {
                        "BM": "Anda ada 2 peringatan.",
                        "BI": "You have 2 reminders.",
                        "BC": "你有2个提醒。",
                        "HK": "你有2個提醒。"
                    },
                    "open_qr": {
                        "BM": "Saya akan buka kod QR untuk bayaran.",
                        "BI": "I will open the QR code for payment.",
                        "BC": "我将打开二维码进行支付。",
                        "HK": "我會打開QR碼俾你付款。"
                    },
                    "go_home": {
                        "BM": "Baiklah, kembali ke halaman utama.",
                        "BI": "Okay, returning to the main page.",
                        "BC": "好的，返回主页。",
                        "HK": "好，返去主頁。"
                    }
                }
                
                reply = action_messages.get(action, {}).get(lang, action_messages.get(action, {}).get("BM", ""))
                reply += f" {prompts['ask'].format(page=page_name)}"
                return {"reply": reply, "lang": lang, "continue_conversation": True}
        
        unknown_msg = {
            "BM": "Maaf, saya hanya boleh bantu urusan STR dan MyKasih.",
            "BI": "Sorry, I can only help with STR and MyKasih matters.",
            "BC": "抱歉，我只能帮助处理STR和MyKasih事务。",
            "HK": "對唔住，我只可以幫你處理STR同MyKasih嘅嘢。"
        }
        return {"reply": unknown_msg.get(lang, unknown_msg["BM"]), "lang": lang, "continue_conversation": False}

    elif step == "ASK_IC":
        ic = decision.get("extracted_ic")
        if ic:
            session_state["temp_data"]["ic"] = ic
            session_state["step"] = "CONFIRM_IC_STEP"
            readable_ic = " ".join(ic)
            ic_confirm = {
                "BM": f"Saya dengar {readable_ic}. Adakah betul?",
                "BI": f"I heard {readable_ic}. Is that correct?",
                "BC": f"我听到{readable_ic}。这对吗？",
                "HK": f"我聽到{readable_ic}。啱唔啱？"
            }
            return {"reply": ic_confirm.get(lang, ic_confirm["BM"]), "lang": lang, "continue_conversation": True}
        else:
            ic_retry = {
                "BM": "Maaf, ulang nombor IC sahaja.",
                "BI": "Sorry, please repeat the IC number only.",
                "BC": "抱歉，请只重复身份证号码。",
                "HK": "對唔住，請只係講返個身份證號碼。"
            }
            return {"reply": ic_retry.get(lang, ic_retry["BM"]), "lang": lang, "continue_conversation": True}

    elif step == "CONFIRM_IC_STEP":
        if decision.get("confirmation"):
            session_state["step"] = "ASK_AMOUNT"
            ask_limit = {
                "BM": "Baik. Berapa limit belanja?",
                "BI": "Okay. What is the spending limit?",
                "BC": "好的。消费限额是多少？",
                "HK": "好。消費限額係幾多？"
            }
            return {"reply": ask_limit.get(lang, ask_limit["BM"]), "lang": lang, "continue_conversation": True}
        else:
            session_state["step"] = "ASK_IC"
            ic_again = {
                "BM": "Maaf. Sila sebut nombor sekali lagi.",
                "BI": "Sorry. Please say the number again.",
                "BC": "抱歉。请再说一次号码。",
                "HK": "對唔住。請再講多次個號碼。"
            }
            return {"reply": ic_again.get(lang, ic_again["BM"]), "lang": lang, "continue_conversation": True}

    elif step == "ASK_AMOUNT":
        amt = decision.get("extracted_amount")
        if amt:
            reset_session()
            limit_set = {
                "BM": f"Selesai. Limit RM{amt} ditetapkan.",
                "BI": f"Done. Limit of RM{amt} has been set.",
                "BC": f"完成。已设置RM{amt}的限额。",
                "HK": f"搞掂。已設定RM{amt}嘅限額。"
            }
            return {"reply": limit_set.get(lang, limit_set["BM"]), "lang": lang, "continue_conversation": False}

    not_understood = {
        "BM": "Maaf tak faham.",
        "BI": "Sorry, I didn't understand.",
        "BC": "抱歉，我不明白。",
        "HK": "對唔住，我唔明。"
    }
    return {"reply": not_understood.get(lang, not_understood["BM"]), "lang": lang, "continue_conversation": False}

def transcribe_audio(audio_data, sample_rate=SAMPLE_RATE, language=None):
    """Transcribe audio using Malaysian Whisper model
    
    Args:
        audio_data: Audio waveform data
        sample_rate: Sample rate (default 16000Hz)
        language: Optional language code ('ms', 'en', 'zh', None for auto-detect)
    """
    if whisper_model is None:
        raise Exception("Whisper model not loaded! Call load_whisper_model() first.")
    
    # Debug: Check audio quality
    audio_length = len(audio_data) / sample_rate
    max_volume = np.max(np.abs(audio_data))
    mean_volume = np.mean(np.abs(audio_data))
    
    print(f"🧠 Transcribing...")
    print(f"   Audio duration: {audio_length:.2f}s")
    print(f"   Max volume: {max_volume:.4f}")
    print(f"   Mean volume: {mean_volume:.6f}")
    if language:
        print(f"   🌐 Language hint: {language}")
    else:
        print(f"   🌐 Auto-detecting language...")
    
    # Check if audio is too quiet or too short
    if max_volume < 0.01:
        print("   ⚠️ WARNING: Audio volume very low - may be empty recording")
    if audio_length < 0.5:
        print("   ⚠️ WARNING: Audio too short (<0.5s)")
    
    inputs = processor(
        audio_data,
        sampling_rate=sample_rate,
        return_tensors="pt"
    ).input_features.to(device).to(torch_dtype)
    
    # Generate with ANTI-HALLUCINATION parameters
    # Key: no_repeat_ngram_size prevents "Terima kasih. Terima kasih. Terima kasih..."
    gen_kwargs = {
        "task": "transcribe",
        "max_new_tokens": 128,  # Reduced from 400 - limits hallucination length
        "do_sample": False,  # Greedy decoding for consistency
        "num_beams": 5,  # Better accuracy with beam search
        "return_timestamps": False,
        "no_repeat_ngram_size": 4,  # CRITICAL: Prevents repeating 4+ word phrases
        "repetition_penalty": 1.2,  # Penalize any repetition
    }
    
    # Add language only if specified (None = auto-detect)
    if language:
        gen_kwargs["language"] = language
    
    gen_ids = whisper_model.generate(inputs, **gen_kwargs)
    
    text = processor.batch_decode(gen_ids, skip_special_tokens=True)[0]
    
    # Check for hallucination (very short audio with common phrases)
    if audio_length < 1.0 and max_volume < 0.02:
        text = ""  # Likely empty audio, return empty
        print("   ⚠️ Detected likely empty audio, returning empty transcript")
    
    print(f"   📝 Transcript: '{text}'")
    return clean_transcription(text)
