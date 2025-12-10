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
    "qr": "/main",  # QR is on main page
    "qr_payment": "/main",
    "payment": "/main",
    "scan": "/main",
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
    """Fallback classification using keywords when Gemini fails"""
    lower_text = text.lower()
    
    # If we're waiting for confirmation (ASK_NAVIGATION, CONFIRM_IC_STEP), check yes/no FIRST
    if step in ["ASK_NAVIGATION", "CONFIRM_IC_STEP", "ASK_AMOUNT"]:
        # Yes keywords - check these first for confirmation steps
        yes_keywords = ["ya", "yes", "ok", "okay", "boleh", "betul", "sure", "yup", "iya", "yaya", "baik"]
        for keyword in yes_keywords:
            # Use word boundary check to avoid "terima kasih" matching "ya" inside words
            if keyword in lower_text.split() or lower_text.startswith(keyword):
                print(f"   🔑 Confirmation: '{keyword}' -> YES")
                return {"navigate_confirmed": True, "confirmation": True}
        
        # No keywords
        no_keywords = ["tidak", "no", "tak", "taknak", "jangan", "cancel", "batal"]
        for keyword in no_keywords:
            if keyword in lower_text.split() or lower_text.startswith(keyword):
                print(f"   🔑 Confirmation: '{keyword}' -> NO")
                return {"navigate_confirmed": False, "confirmation": False}
    
    # STR related keywords
    str_keywords = ["str", "sumbangan", "tunai", "sumbangan tunai", "bantuan tunai", "check str", "cek str"]
    for keyword in str_keywords:
        if keyword in lower_text:
            print(f"   🔑 Keyword match: '{keyword}' -> check_str_status")
            return {"action_id": "check_str_status"}
    
    # MyKasih/SARA related keywords - but not "terima kasih"
    if "terima kasih" not in lower_text:
        mykasih_keywords = ["mykasih", "my kasih", "sara", "baki", "balance", "kasih"]
        for keyword in mykasih_keywords:
            if keyword in lower_text:
                print(f"   🔑 Keyword match: '{keyword}' -> check_mykasih_balance")
                return {"action_id": "check_mykasih_balance"}
    
    # Apply STR
    apply_keywords = ["mohon", "apply", "daftar str", "permohonan"]
    for keyword in apply_keywords:
        if keyword in lower_text:
            print(f"   🔑 Keyword match: '{keyword}' -> apply_str")
            return {"action_id": "apply_str"}
    
    # QR Payment / Scan
    qr_keywords = ["qr", "scan", "bayar", "payment", "pay", "kod qr", "imbas"]
    for keyword in qr_keywords:
        if keyword in lower_text:
            print(f"   🔑 Keyword match: '{keyword}' -> open_qr")
            return {"action_id": "open_qr"}
    
    # Reminders
    reminder_keywords = ["reminder", "peringatan", "temujanji", "appointment"]
    for keyword in reminder_keywords:
        if keyword in lower_text:
            print(f"   🔑 Keyword match: '{keyword}' -> check_reminders")
            return {"action_id": "check_reminders"}
    
    # Home/Main
    home_keywords = ["home", "balik", "main", "utama", "keluar"]
    for keyword in home_keywords:
        if keyword in lower_text:
            print(f"   🔑 Keyword match: '{keyword}' -> go_home")
            return {"action_id": "go_home"}
    
    # Yes/No for navigation confirmation (fallback for IDLE step too)
    yes_keywords = ["ya", "yes", "ok", "okay", "boleh", "betul", "sure", "yup", "iya", "yaya", "baik"]
    for keyword in yes_keywords:
        if keyword in lower_text.split() or lower_text.startswith(keyword):
            return {"navigate_confirmed": True, "confirmation": True}
    
    no_keywords = ["tidak", "no", "tak", "taknak", "jangan", "cancel", "batal"]
    for keyword in no_keywords:
        if keyword in lower_text.split() or lower_text.startswith(keyword):
            return {"navigate_confirmed": False, "confirmation": False}
    
    return {"action_id": "unknown"}

def clean_transcription(text):
    text_upper = text.upper()
    replacements = {"SDR": "STR", "STRR": "STR", "SUMBANGAN TUNAI": "STR"}
    for wrong, correct in replacements.items():
        if wrong in text_upper:
            text = text.replace(wrong, correct)
    return text

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
            # Supports: ms=Malay, en=English, zh=Chinese, HK=Cantonese/Chinese, ta=Tamil
            lang_map = {"ms": "BM", "en": "BI", "zh": "BC", "HK": "BC", "hk": "BC", "ta": "BI", "zh-HK": "BC"}
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
        Act as a classifier. Map user text to ONE action_id from: {json.dumps(ACTION_MENU)}.
        RULES:
        1. "anak perempuan", "memberikan", "benarkan", "authorize", "guna wang", "use money" -> initiate_add_rep
        2. "check STR", "STR status", "STR balance", "Sumbangan Tunai" -> check_str_status
        3. "check MyKasih", "SARA", "MyKasih balance" -> check_mykasih_balance
        4. "apply STR", "mohon STR" -> apply_str
        5. "reminders", "appointments", "temujanji" -> check_reminders
        6. "home", "main page", "balik" -> go_home
        7. "QR", "scan", "payment", "bayar", "imbas", "pay" -> open_qr
        Output JSON ONLY: {{ "action_id": "..." }}
        """
    elif step == "ASK_IC":
        sys_prompt = "Extract IC number (digits only). Output JSON: { 'extracted_ic': '123456...' }"
    elif step == "CONFIRM_IC_STEP":
        sys_prompt = "Did user confirm (Yes/Betul) or deny (No/Salah)? Output JSON: { 'confirmation': true/false }"
    elif step == "ASK_AMOUNT":
        sys_prompt = "Extract amount (number only). Output JSON: { 'extracted_amount': 100 }"
    elif step == "ASK_NAVIGATION":
        sys_prompt = """
        User is asked if they want to navigate to a page.
        Did they say YES (ya/ok/betul/yes/sure/boleh) or NO (tidak/no/taknak)?
        Output JSON: { 'navigate_confirmed': true/false }
        """
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
    decision = ask_gemini_brain(user_text)
    step = session_state["step"]

    profile = get_profile_data(user_ic)
    lang = profile.get('language', 'BM')

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
        }
    }

    page_names = {
        "str": {"BM": "STR", "BC": "STR", "BI": "STR"},
        "sara": {"BM": "MyKasih", "BC": "MyKasih", "BI": "MyKasih"},
        "str_apply": {"BM": "Permohonan STR", "BC": "STR申请", "BI": "STR Application"},
        "reminders": {"BM": "Peringatan", "BC": "提醒", "BI": "Reminders"},
        "main": {"BM": "Utama", "BC": "主页", "BI": "Home"},
        "qr": {"BM": "Kod QR", "BC": "二维码", "BI": "QR Code"},
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
            return {"reply": "Boleh. Sila berikan nombor Kad Pengenalan anak anda?", "lang": lang, "continue_conversation": True}
        
        elif action == "check_str_status":
            aid_data = get_financial_aid_data(user_ic)
            if aid_data.get("str_eligible"):
                next_payment = aid_data.get("str_nextPayAmount", 200)
                reply = f"Permohonan STR anda lulus. Bayaran seterusnya RM{next_payment}."
            else:
                reply = "Permohonan STR anda masih dalam proses."
            
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
            reply = f"Baki MyKasih anda tinggal RM{balance}."
            
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
                        "BC": "你可以在申请页面申请STR。"
                    },
                    "check_reminders": {
                        "BM": "Anda ada 2 peringatan.",
                        "BI": "You have 2 reminders.",
                        "BC": "你有2个提醒。"
                    },
                    "open_qr": {
                        "BM": "Saya akan buka kod QR untuk bayaran.",
                        "BI": "I will open the QR code for payment.",
                        "BC": "我将打开二维码进行支付。"
                    },
                    "go_home": {
                        "BM": "Baiklah, kembali ke halaman utama.",
                        "BI": "Okay, returning to the main page.",
                        "BC": "好的，返回主页。"
                    }
                }
                
                reply = action_messages.get(action, {}).get(lang, action_messages.get(action, {}).get("BM", ""))
                reply += f" {prompts['ask'].format(page=page_name)}"
                return {"reply": reply, "lang": lang, "continue_conversation": True}
        
        return {"reply": "Maaf, saya hanya boleh bantu urusan STR dan MyKasih.", "lang": lang, "continue_conversation": False}

    elif step == "ASK_IC":
        ic = decision.get("extracted_ic")
        if ic:
            session_state["temp_data"]["ic"] = ic
            session_state["step"] = "CONFIRM_IC_STEP"
            readable_ic = " ".join(ic)
            return {"reply": f"Saya dengar {readable_ic}. Adakah betul?", "lang": lang, "continue_conversation": True}
        else:
            return {"reply": "Maaf, ulang nombor IC sahaja.", "lang": lang, "continue_conversation": True}

    elif step == "CONFIRM_IC_STEP":
        if decision.get("confirmation"):
            session_state["step"] = "ASK_AMOUNT"
            return {"reply": "Baik. Berapa limit belanja?", "lang": lang, "continue_conversation": True}
        else:
            session_state["step"] = "ASK_IC"
            return {"reply": "Maaf. Sila sebut nombor sekali lagi.", "lang": lang, "continue_conversation": True}

    elif step == "ASK_AMOUNT":
        amt = decision.get("extracted_amount")
        if amt:
            reset_session()
            return {"reply": f"Selesai. Limit RM{amt} ditetapkan.", "lang": lang, "continue_conversation": False}

    return {"reply": "Maaf tak faham.", "lang": lang, "continue_conversation": False}

def transcribe_audio(audio_data, sample_rate=SAMPLE_RATE):
    """Transcribe audio using Malaysian Whisper model"""
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
    
    # Generate with better parameters
    gen_ids = whisper_model.generate(
        inputs,
        language="ms",
        task="transcribe",
        max_new_tokens=400,
        do_sample=False,  # Greedy decoding for consistency
        num_beams=5,  # Better accuracy with beam search
        return_timestamps=False
    )
    
    text = processor.batch_decode(gen_ids, skip_special_tokens=True)[0]
    
    # Check for hallucination (very short audio with common phrases)
    if audio_length < 1.0 and max_volume < 0.02:
        text = ""  # Likely empty audio, return empty
        print("   ⚠️ Detected likely empty audio, returning empty transcript")
    
    print(f"   📝 Transcript: '{text}'")
    return clean_transcription(text)
