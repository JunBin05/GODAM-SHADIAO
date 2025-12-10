"""
GODAM SHADIAO - Unified Voice API Server
Combines backend + voice navigation in one server
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import soundfile as sf
import io
import sys
import os

# Add paths
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_path)
sys.path.insert(0, os.path.dirname(__file__))

app = FastAPI(title="GODAM SHADIAO API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for lazy loading
whisper_model = None
processor = None
SAMPLE_RATE = 16000
session_state = {"step": "IDLE", "temp_data": {}, "last_action": None, "pending_navigation": None}

def load_models():
    """Lazy load Whisper model only when needed"""
    global whisper_model, processor
    
    if whisper_model is not None:
        return True
    
    try:
        print("⏳ Loading Whisper model (first-time only)...")
        import torch
        from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
        
        MODEL_ID = "mesolitica/malaysian-whisper-medium-v2"
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        
        processor = AutoProcessor.from_pretrained(MODEL_ID)
        whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
            MODEL_ID,
            torch_dtype=torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True
        ).to(device)
        
        print(f"✅ Whisper model loaded on {device}")
        return True
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return False

def transcribe_audio_simple(audio_data):
    """Simple transcription using loaded model"""
    if not load_models():
        return "Model not available"
    
    import torch
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    
    inputs = processor(
        audio_data,
        sampling_rate=SAMPLE_RATE,
        return_tensors="pt"
    ).input_features.to(device).to(torch_dtype)
    
    gen_ids = whisper_model.generate(
        inputs,
        language="ms",
        task="transcribe",
        max_new_tokens=400
    )
    
    text = processor.batch_decode(gen_ids, skip_special_tokens=True)[0]
    return text

def get_ai_response(text, user_ic="900101012345"):
    """Simple AI response using Gemini"""
    import google.generativeai as genai
    
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
    genai.configure(api_key=GOOGLE_API_KEY)
    
    # Simple responses for common queries
    lower_text = text.lower()
    
    if "str" in lower_text or "sumbangan tunai" in lower_text:
        reply = "Permohonan STR anda lulus. Bayaran seterusnya RM200. Adakah anda mahu pergi ke halaman STR?"
        navigate_to = "str"
    elif "mykasih" in lower_text or "sara" in lower_text:
        reply = "Baki MyKasih anda tinggal RM50. Adakah anda mahu pergi ke halaman MyKasih?"
        navigate_to = "sara"
    elif "balik" in lower_text or "home" in lower_text:
        reply = "Baiklah, kembali ke halaman utama. Adakah anda mahu pergi ke halaman utama?"
        navigate_to = "main"
    else:
        reply = f"Saya faham anda berkata: {text}. Saya boleh bantu dengan STR atau MyKasih."
        navigate_to = None
    
    return {
        "transcript": text,
        "reply": reply,
        "lang": "BM",
        "continue_conversation": navigate_to is not None,
        "navigate_to": navigate_to,
        "session_state": session_state
    }

@app.get("/")
def root():
    return {
        "status": "GODAM SHADIAO API Running",
        "endpoints": {
            "voice": "/voice/process",
            "health": "/health"
        }
    }

@app.get("/health")
def health():
    return {"status": "ok", "whisper_loaded": whisper_model is not None}

@app.post("/voice/process")
async def process_voice(
    audio: UploadFile = File(...),
    user_ic: str = Form(default="900101012345")
):
    """Process voice audio and return AI response"""
    try:
        # Read audio
        audio_bytes = await audio.read()
        audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)
        
        # Resample if needed
        if sample_rate != SAMPLE_RATE:
            import librosa
            audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=SAMPLE_RATE)
        
        audio_data = audio_data.astype(np.float32)
        
        # Transcribe
        print("🎙️ Transcribing audio...")
        transcript = transcribe_audio_simple(audio_data)
        print(f"   You said: {transcript}")
        
        # Get AI response
        result = get_ai_response(transcript, user_ic)
        print(f"   AI reply: {result['reply']}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/reset")
def reset_conversation():
    """Reset conversation state"""
    global session_state
    session_state = {"step": "IDLE", "temp_data": {}, "last_action": None, "pending_navigation": None}
    return {"status": "Session reset"}

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎙️  GODAM SHADIAO - UNIFIED API SERVER")
    print("="*60)
    print("Backend + Voice Navigation on http://localhost:8001")
    print("Note: Whisper model loads on first voice request")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
