# ==========================================
# VOICE NAVIGATION - LOCAL VERSION
# ==========================================
# Original: Google Colab version
# This: Local desktop version using same models
# ==========================================

import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
import time
import re
import subprocess
import torch
import librosa
import numpy as np
import sounddevice as sd
import soundfile as sf
import pyttsx3
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import threading
import queue

# Initialize pyttsx3 TTS engine
tts_engine = pyttsx3.init()
# Set speech rate (default is usually 200, lower = slower)
tts_engine.setProperty('rate', 150)
# Set volume to maximum (0.0 to 1.0)
tts_engine.setProperty('volume', 1.0)
# List available voices
voices = tts_engine.getProperty('voices')
print(f"Available TTS voices: {[v.name for v in voices]}")

# Map language codes to voice indices
# Based on available voices: [0] David (English), [1] Zira (English), [2] Huihui (Chinese)
TTS_VOICE_MAP = {
    "BC": 2,  # Chinese - Huihui
    "BM": 0,  # Malay - use English David (no Malay voice available)
    "BI": 1,  # English - Zira (female)
}

# ==========================================
# 1. CONFIGURATION
# ==========================================
# ⚠️ REPLACE WITH YOUR ACTUAL KEY
GOOGLE_API_KEY = "AIzaSyDkpD-MI3V0lR28euQxK521Jq-QTjDLGdc"
genai.configure(api_key=GOOGLE_API_KEY)

# Firebase Setup
db = None
try:
    if not firebase_admin._apps:
        # Look for serviceAccountKey.json in parent directory or current
        key_paths = [
            "serviceAccountKey.json",
            "../serviceAccountKey.json",
            os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")
        ]
        key_found = None
        for path in key_paths:
            if os.path.exists(path):
                key_found = path
                break
        
        if key_found:
            cred = credentials.Certificate(key_found)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✅ Firebase Connected")
        else:
            print("⚠️ Mock Data Mode (No serviceAccountKey.json found)")
except Exception as e:
    print(f"⚠️ Firebase Error: {e}. Using Mock Data Mode.")

# ==========================================
# 2. WHISPER MODEL SETUP (SAME MODEL AS COLAB)
# ==========================================
MODEL_ID = "mesolitica/malaysian-whisper-medium-v2"
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

print(f"⏳ Loading Whisper Model on {device}...")
print(f"   Model: {MODEL_ID}")

processor = AutoProcessor.from_pretrained(MODEL_ID)
whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
    MODEL_ID, 
    torch_dtype=torch_dtype, 
    low_cpu_mem_usage=True, 
    use_safetensors=True
).to(device)

print("✅ Whisper Model Ready")

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
    model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_instruction)

    for i in range(retries):
        try:
            time.sleep(1)  # Tiny buffer to prevent spamming
            return model.generate_content(prompt).text.strip()
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg:
                wait_time = 3 * (i + 1)  # Wait 3s, 6s, 9s
                print(f"⚠️ Server Busy (429). Waiting {wait_time}s...")
                time.sleep(wait_time)
            elif "404" in error_msg:
                print("❌ Model Not Found. Switching to fallback 'gemini-pro'...")
                fallback_model = genai.GenerativeModel("gemini-pro", system_instruction=system_instruction)
                return fallback_model.generate_content(prompt).text.strip()
            else:
                print(f"❌ API Error: {e}")
                return ""
    return ""

def clean_transcription(text):
    text_upper = text.upper()
    replacements = {"SDR": "STR", "STRR": "STR", "SUMBANGAN TUNAI": "STR"}
    for wrong, correct in replacements.items():
        if wrong in text_upper:
            text = text.replace(wrong, correct)
    return text

# ==========================================
# 4. DATABASE FUNCTIONS (MOCK)
# ==========================================
def get_profile_data(ic_number):
    # TODO: Replace with actual Firebase query if db is available
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
    else:
        sys_prompt = "Output JSON: {}"

    response_text = call_gemini_safe(user_text, system_instruction=sys_prompt)
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

# ==========================================
# 7. LOCAL AUDIO RECORDING (PUSH-TO-TALK)
# ==========================================
SAMPLE_RATE = 16000
RECORDING_DURATION = 6  # seconds - fallback max duration

# Global flag for recording control
is_recording = False
audio_buffer = []

def record_push_to_talk(sample_rate=SAMPLE_RATE, max_duration=30):
    """Push-to-talk: Press ENTER to start, press ENTER again to stop"""
    global is_recording, audio_buffer
    
    print("\n" + "=" * 40)
    print("🎙️  PUSH-TO-TALK MODE")
    print("=" * 40)
    input("👉 Press ENTER to START recording...")
    
    print("\n🔴 RECORDING... Speak now!")
    print("👉 Press ENTER to STOP recording when done.\n")
    
    # Reset buffer
    audio_buffer = []
    is_recording = True
    
    # Callback function for audio stream
    def audio_callback(indata, frames, time_info, status):
        if status:
            print(f"Status: {status}")
        if is_recording:
            audio_buffer.append(indata.copy())
            # Visual feedback
            vol = np.abs(indata).mean()
            if vol > 0.01:
                print("🔊", end="", flush=True)
            else:
                print("·", end="", flush=True)
    
    # Start audio stream
    import threading
    
    def wait_for_stop():
        global is_recording
        input()  # Wait for ENTER
        is_recording = False
    
    stop_thread = threading.Thread(target=wait_for_stop, daemon=True)
    stop_thread.start()
    
    # Use InputStream for recording
    try:
        with sd.InputStream(samplerate=sample_rate, channels=1, dtype=np.float32, 
                           callback=audio_callback, blocksize=1600):  # 100ms blocks
            # Wait until stopped or max duration
            start_time = time.time()
            while is_recording and (time.time() - start_time) < max_duration:
                time.sleep(0.1)
    except Exception as e:
        print(f"\n❌ Audio stream error: {e}")
        return np.array([], dtype=np.float32)
    
    print("\n")
    
    if not audio_buffer:
        print("⚠️ No audio recorded!")
        return np.array([], dtype=np.float32)
    
    # Concatenate all audio chunks
    audio_data = np.concatenate(audio_buffer, axis=0).flatten()
    max_vol = np.max(np.abs(audio_data))
    duration = len(audio_data) / sample_rate
    
    print(f"✅ Recording stopped! (Duration: {duration:.1f}s, Max volume: {max_vol:.4f})")
    
    if max_vol < 0.01:
        print("⚠️  WARNING: Very low audio - check microphone!")
        print("   Run 'test' command to diagnose microphone issues.")
    
    return audio_data

def record_audio(duration=RECORDING_DURATION, sample_rate=SAMPLE_RATE):
    """Record audio from microphone for fixed duration (fallback)"""
    print(f"\n🎙️ Recording for {duration} seconds... SPEAK NOW!")
    print("   " + "▓" * 30)
    
    # Record audio
    audio_data = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype=np.float32
    )
    sd.wait()  # Wait until recording is finished
    
    # Check if we got audio
    max_vol = np.max(np.abs(audio_data))
    mean_vol = np.mean(np.abs(audio_data))
    
    print(f"✅ Recording complete! (Volume: max={max_vol:.3f}, mean={mean_vol:.4f})")
    
    if max_vol < 0.01:
        print("⚠️  WARNING: Very low audio detected - speak louder!")
    
    return audio_data.flatten()

def record_until_silence(sample_rate=SAMPLE_RATE, silence_threshold=0.005, silence_duration=2.0, max_duration=15):
    """Record until user stops speaking (detects silence)"""
    print("\n🎙️ Listening... (Speak now, will stop after you pause)")
    
    audio_chunks = []
    silent_chunks = 0
    speech_detected = False
    chunk_duration = 0.1  # 100ms chunks
    chunk_samples = int(sample_rate * chunk_duration)
    silence_chunks_needed = int(silence_duration / chunk_duration)
    max_chunks = int(max_duration / chunk_duration)
    
    total_chunks = 0
    
    while total_chunks < max_chunks:
        chunk = sd.rec(chunk_samples, samplerate=sample_rate, channels=1, dtype=np.float32)
        sd.wait()
        audio_chunks.append(chunk.flatten())
        
        chunk_volume = np.abs(chunk).mean()
        
        # Visual feedback
        if chunk_volume > 0.01:
            print("🔊", end="", flush=True)
            speech_detected = True
            silent_chunks = 0
        else:
            if speech_detected:
                print(".", end="", flush=True)
            silent_chunks += 1
        
        total_chunks += 1
        
        # Stop if we've had enough silence AFTER some speech was detected
        if speech_detected and silent_chunks >= silence_chunks_needed:
            break
    
    print()  # New line after visual feedback
    
    audio_data = np.concatenate(audio_chunks)
    max_vol = np.max(np.abs(audio_data))
    
    print(f"✅ Recording complete! (Duration: {len(audio_data)/sample_rate:.1f}s, Max volume: {max_vol:.3f})")
    
    if not speech_detected:
        print("⚠️  No speech detected! Please speak louder.")
    
    return audio_data

# ==========================================
# 8. SPEECH-TO-TEXT (SAME MODEL)
# ==========================================
def transcribe_audio(audio_data, sample_rate=SAMPLE_RATE):
    """Transcribe audio using Malaysian Whisper model"""
    print("🧠 Transcribing...")
    
    # Prepare input
    inputs = processor(
        audio_data, 
        sampling_rate=sample_rate, 
        return_tensors="pt"
    ).input_features.to(device).to(torch_dtype)
    
    # Generate transcription
    gen_ids = whisper_model.generate(
        inputs, 
        language="ms", 
        task="transcribe", 
        max_new_tokens=400
    )
    
    text = processor.batch_decode(gen_ids, skip_special_tokens=True)[0]
    return text

# ==========================================
# 9. TEXT-TO-SPEECH & PLAYBACK (PYTTSX3 - Instant & Offline)
# ==========================================

def speak_response(response_data):
    """Generate and play TTS response using pyttsx3 (instant, offline)"""
    text = response_data["reply"]
    lang_code = response_data["lang"]
    
    # Translate if needed
    lang_map = {"BM": "Bahasa Melayu", "BC": "Mandarin Chinese", "BI": "English"}
    target_lang = lang_map.get(lang_code, "Bahasa Melayu")
    
    sys_prompt = f"You are a Translator. Translate input to {target_lang}. Output ONLY the translation. NO explanations."
    final_text = call_gemini_safe(text, system_instruction=sys_prompt)
    
    # Clean text
    final_text = re.sub(r'[^\w\s\u4e00-\u9fff,.?!]', '', final_text)
    print(f"🤖 AI ({target_lang}): {final_text}")
    
    try:
        # Set voice based on user's language preference
        voice_index = TTS_VOICE_MAP.get(lang_code, 0)
        voices = tts_engine.getProperty('voices')
        if voice_index < len(voices):
            tts_engine.setProperty('voice', voices[voice_index].id)
            print(f"🔊 Speaking in {voices[voice_index].name}...")
        
        # Speak using pyttsx3 (instant playback)
        tts_engine.say(final_text)
        tts_engine.runAndWait()
        print("✅ Done speaking")
        
    except Exception as e:
        print(f"❌ TTS Error: {e}")
        print(f"   Response text: {final_text}")
        import traceback
        traceback.print_exc()

# ==========================================
# 10. MAIN LOOP
# ==========================================
def process_voice_input(use_push_to_talk=True):
    """Process one round of voice input"""
    # Record audio - use push-to-talk by default
    if use_push_to_talk:
        audio_data = record_push_to_talk()
    else:
        audio_data = record_audio(duration=6)
    
    # Check if audio has content
    if len(audio_data) == 0:
        print("⚠️ No audio recorded, try again.")
        return True
        
    max_vol = np.max(np.abs(audio_data))
    if max_vol < 0.01:
        print("⚠️ No speech detected (volume too low), try again.")
        return True
    
    # Save for debugging (optional)
    sf.write("input.wav", audio_data, SAMPLE_RATE)
    print("   (Saved to input.wav for debugging)")
    
    # Transcribe
    print("🧠 Transcribing...")
    raw_text = transcribe_audio(audio_data)
    print(f"\n👤 You said: \"{raw_text}\"")
    
    if not raw_text.strip():
        print("⚠️ Transcription empty, try speaking more clearly.")
        return True
    
    # Clean and process
    clean_text = clean_transcription(raw_text)
    
    # Run agent logic
    print("🤔 Processing...")
    result = run_agent_logic(clean_text)
    
    # Speak response
    speak_response(result)
    
    return result["continue_conversation"]

def main():
    """Main conversation loop"""
    print("\n" + "=" * 55)
    print("🤖 GOVERNMENT VOICE AGENT - LOCAL VERSION (Push-to-Talk)")
    print("=" * 55)
    print("\n📋 HOW TO USE:")
    print("   1. Press ENTER to start recording")
    print("   2. Speak into your microphone")
    print("   3. Press ENTER again to stop recording")
    print("\n⌨️  COMMANDS:")
    print("   'test'  - Test microphone")
    print("   'reset' - Reset conversation")
    print("   'quit'  - Exit program")
    print("=" * 55 + "\n")
    
    while True:
        try:
            user_input = input("\n🎤 Type command or press ENTER to start: ").strip().lower()
            
            if user_input in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            elif user_input == 'reset':
                reset_session()
                print("🔄 Session reset.")
                continue
            elif user_input == 'test':
                # Microphone test
                print("\n🔬 MICROPHONE TEST")
                print("Recording 3 seconds... Speak now!")
                audio = sd.rec(int(3 * 16000), samplerate=16000, channels=1, dtype=np.float32)
                sd.wait()
                max_vol = np.max(np.abs(audio))
                mean_vol = np.mean(np.abs(audio))
                print(f"   Max volume: {max_vol:.4f}")
                print(f"   Mean volume: {mean_vol:.6f}")
                if max_vol < 0.01:
                    print("   ❌ Microphone NOT working or muted!")
                elif max_vol < 0.05:
                    print("   ⚠️ Audio LOW - speak louder or adjust mic")
                else:
                    print("   ✅ Microphone working great!")
                continue
            
            # Process voice with push-to-talk
            continue_conversation = process_voice_input(use_push_to_talk=True)
            
            # Auto-continue if needed (for multi-turn conversation)
            while continue_conversation:
                time.sleep(1)  # Brief pause
                print("\n🔄 Continuing conversation...")
                continue_conversation = process_voice_input(use_push_to_talk=True)
                
        except KeyboardInterrupt:
            print("\n👋 Interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            continue

if __name__ == "__main__":
    main()
