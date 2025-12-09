# ==========================================
# 1. INSTALL DEPENDENCIES & IMPORTS
# ==========================================
!pip install -q -U google-generativeai firebase-admin gTTS transformers librosa accelerate bitsandbytes ffmpeg-python

import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import base64
import os
import time
import re
import subprocess
import torch
import librosa
import numpy as np
from gtts import gTTS
from IPython.display import Audio, display, HTML
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
from google.colab import output

# ==========================================
# 2. CONFIGURATION
# ==========================================
# ⚠️ REPLACE WITH YOUR ACTUAL KEY
GOOGLE_API_KEY = "AIzaSyDkpD-MI3V0lR28euQxK521Jq-QTjDLGdc"
genai.configure(api_key=GOOGLE_API_KEY)

# Firebase Setup
if not firebase_admin._apps:
    if os.path.exists("serviceAccountKey.json"):
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Connected")
    else:
        print("⚠️ Mock Data Mode (No DB Key found)")

db = firestore.client()

# Whisper Setup
MODEL_ID = "mesolitica/malaysian-whisper-medium-v2"
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

if 'whisper_model' not in globals():
    print(f"⏳ Loading Whisper ({device})...")
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
        MODEL_ID, torch_dtype=torch_dtype, low_cpu_mem_usage=True, use_safetensors=True
    ).to(device)
    print("✅ Whisper Ready")

# ==========================================
# 3. GLOBAL STATE & SMART RETRY LOGIC
# ==========================================
session_state = {
    "step": "IDLE",
    "temp_data": {},
    "last_action": None
}

def reset_session():
    global session_state
    session_state = {"step": "IDLE", "temp_data": {}, "last_action": None}

def call_gemini_safe(prompt, system_instruction=None, retries=3):
    """
    Tries Gemini 2.5. If it hits Rate Limit (429), it waits and retries.
    """
    # USE THE NEWER MODEL (Since 1.5 is retired)
    model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_instruction)

    for i in range(retries):
        try:
            # Tiny buffer to prevent spamming
            time.sleep(1)
            return model.generate_content(prompt).text.strip()
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg:
                wait_time = 3 * (i + 1) # Wait 3s, 6s, 9s
                print(f"⚠️ Server Busy (429). Waiting {wait_time}s...")
                time.sleep(wait_time)
            elif "404" in error_msg:
                print("❌ Model Not Found. Switching to fallback 'gemini-pro'...")
                # Emergency fallback if 2.5 also disappears
                fallback_model = genai.GenerativeModel("gemini-pro", system_instruction=system_instruction)
                return fallback_model.generate_content(prompt).text.strip()
            else:
                print(f"❌ API Error: {e}")
                return ""
    return ""

def clean_transcription(text):
    text_upper = text.upper()
    replacements = { "SDR": "STR", "STRR": "STR", "SUMBANGAN TUNAI": "STR" }
    for wrong, correct in replacements.items():
        if wrong in text_upper: text = text.replace(wrong, correct)
    return text

# ==========================================
# 4. DATABASE FUNCTIONS (MOCK)
# ==========================================
def get_profile_data(ic_number):
    return {"name": "Tan Mei Ling", "language": "BC"}

def get_financial_aid_data(ic_number):
    return {"str_eligible": True, "str_nextPayAmount": 500, "mykasih_balance_not_expire": 50}

# ==========================================
# 5. ROUTER & EXTRACTION
# ==========================================
ACTION_MENU = [
    {"action_id": "check_str_status", "desc": "User asks about STR/Sumbangan Tunai status."},
    {"action_id": "check_mykasih_balance", "desc": "User asks about MyKasih/SARA balance."},
    {"action_id": "initiate_add_rep", "desc": "User wants to AUTHORIZE someone (child/daughter) to use their ID/money."},
    {"action_id": "unknown", "desc": "Unrelated topic."}
]

def ask_gemini_brain(user_text):
    global session_state
    step = session_state["step"]

    if step == "IDLE":
        sys_prompt = f"""
        Act as a classifier. Map user text to ONE action_id from: {json.dumps(ACTION_MENU)}.
        RULES:
        1. "anak perempuan", "memberikan", "benarkan", "authorize", "guna wang", "use money" -> initiate_add_rep
        2. Output JSON ONLY: {{ "action_id": "..." }}
        """
    elif step == "ASK_IC":
        sys_prompt = "Extract IC number (digits only). Output JSON: { 'extracted_ic': '123456...' }"
    elif step == "CONFIRM_IC_STEP":
        sys_prompt = "Did user confirm (Yes/Betul) or deny (No/Salah)? Output JSON: { 'confirmation': true/false }"
    elif step == "ASK_AMOUNT":
        sys_prompt = "Extract amount (number only). Output JSON: { 'extracted_amount': 100 }"

    # Call with Retry Logic
    response_text = call_gemini_safe(user_text, system_instruction=sys_prompt)

    # Clean JSON
    clean_json = response_text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(clean_json)
    except:
        return {}

# ==========================================
# 6. AGENT LOGIC
# ==========================================
def run_agent_logic(user_text, user_ic="900101012345"):
    global session_state
    decision = ask_gemini_brain(user_text)
    step = session_state["step"]

    profile = get_profile_data(user_ic)
    lang = profile.get('language', 'BM')

    if step == "IDLE":
        action = decision.get("action_id")
        if action == "initiate_add_rep":
            session_state["step"] = "ASK_IC"
            return {"reply": "Boleh. Sila berikan nombor Kad Pengenalan anak anda?", "lang": lang, "continue_conversation": True}
        elif action == "check_str_status":
             return {"reply": "Permohonan STR anda lulus. Bayaran seterusnya RM200.", "lang": lang, "continue_conversation": False}
        elif action == "check_mykasih_balance":
            return {"reply": "Baki MyKasih anda tinggal RM50.", "lang": lang, "continue_conversation": False}
        return {"reply": "Maaf, saya hanya boleh bantu urusan STR dan MyKasih.", "lang": lang, "continue_conversation": False}

    elif step == "ASK_IC":
        ic = decision.get("extracted_ic")
        if ic:
            session_state["temp_data"]["ic"] = ic
            session_state["step"] = "CONFIRM_IC_STEP"
            readable_ic = " ".join(ic) # 9 0 0 1
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

# ==========================================
# 7. GENERATORS
# ==========================================
def generate_nlg_and_speak(response_data):
    text = response_data["reply"]
    lang_code = response_data["lang"]
    should_continue = response_data["continue_conversation"]

    # 1. Translate
    lang_map = {"BM": "Bahasa Melayu", "BC": "Mandarin Chinese"}
    target_lang = lang_map.get(lang_code, "Bahasa Melayu")

    sys_prompt = f"You are a Translator. Translate input to {target_lang}. Output ONLY the translation. NO explanations."
    final_text = call_gemini_safe(text, system_instruction=sys_prompt)

    # Clean text
    final_text = re.sub(r'[^\w\s\u4e00-\u9fff,.?]', '', final_text)
    print(f"🤖 AI ({target_lang}): {final_text}")

    # 2. TTS (GOOGLE STANDARD)
    google_lang_map = { "BM": "ms", "BC": "zh-cn", "BI": "en" }
    g_lang = google_lang_map.get(lang_code, "ms")

    try:
        tts = gTTS(text=final_text, lang=g_lang)
        tts.save("out.mp3")

        audio_len = librosa.get_duration(filename="out.mp3")
        wait_time_ms = (audio_len * 1000) + 1500 # 1.5s buffer

        display(Audio("out.mp3", autoplay=True))

        if should_continue:
            print(f"🔄 Listening again in {audio_len:.1f}s...")
            output.eval_js(f'triggerLoop({wait_time_ms})')
        else:
            print("⏹️ Done.")

    except Exception as e:
        print(f"TTS Error: {e}")

# ==========================================
# 8. MAIN UI
# ==========================================
def process_audio(b64_string):
    with open("in.webm", "wb") as f: f.write(base64.b64decode(b64_string.split(',')[1]))
    subprocess.call(['ffmpeg', '-i', 'in.webm', '-ar', '16000', '-ac', '1', 'in.wav', '-y'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    audio, _ = librosa.load("in.wav", sr=16000)
    inputs = processor(audio, sampling_rate=16000, return_tensors="pt").input_features.to(device).to(torch_dtype)
    gen_ids = whisper_model.generate(inputs, language="ms", task="transcribe", max_new_tokens=400)
    raw_text = processor.batch_decode(gen_ids, skip_special_tokens=True)[0]

    print(f"👤 You: {raw_text}")
    clean_text = clean_transcription(raw_text)

    result = run_agent_logic(clean_text)
    generate_nlg_and_speak(result)

output.register_callback('notebook.transcribe', process_audio)

def show_recorder():
    AUDIO_HTML = """
    <div style="text-align:center; padding: 20px; border: 2px solid #ddd; border-radius: 10px;">
        <h3>🤖 Government Agent (Robust Mode)</h3>
        <button id="recordBtn" style="font-size:20px; background:#4b7bec; color:white; border:none; padding:15px 30px; border-radius:8px; cursor:pointer;">🎙️ Start Conversation</button>
        <div id="status" style="margin-top:15px; font-family:monospace; color:#333; font-size: 16px;">Idle</div>
    </div>
    <script>
    var recordBtn = document.getElementById('recordBtn');
    var statusDiv = document.getElementById('status');
    var recorder, gumStream;

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
            gumStream = stream;
            recorder = new MediaRecorder(stream);
            recorder.ondataavailable = function(e) {
                var reader = new FileReader();
                reader.readAsDataURL(e.data);
                reader.onloadend = function() {
                    google.colab.kernel.invokeFunction('notebook.transcribe', [reader.result], {});
                }
            };
            recorder.start();
            statusDiv.innerHTML = "🔴 Listening... (Speak Now)";
            statusDiv.style.color = "red";
            recordBtn.innerHTML = "⏹️ Stop & Send";
            recordBtn.style.background = "#d63031";
        });
    }

    function stopRecording() {
        if (recorder && recorder.state == "recording") {
            recorder.stop();
            gumStream.getAudioTracks()[0].stop();
            statusDiv.innerHTML = "🧠 Processing...";
            statusDiv.style.color = "blue";
            recordBtn.innerHTML = "⏳ Please Wait...";
            recordBtn.style.background = "#b2bec3";
        }
    }

    recordBtn.onclick = function() {
        if (recorder && recorder.state == "recording") {
            stopRecording();
        } else {
            startRecording();
        }
    }

    window.triggerLoop = function(delayMs) {
        statusDiv.innerHTML = "🔊 Bot Speaking... (Listening again soon)";
        statusDiv.style.color = "green";
        setTimeout(() => {
            statusDiv.innerHTML = "👂 Auto-starting microphone...";
            startRecording();
        }, delayMs);
    }
    </script>
    """
    display(HTML(AUDIO_HTML))

print("✅ AGENT ONLINE: Gemini 2.5 + Anti-Crash Logic")
show_recorder()