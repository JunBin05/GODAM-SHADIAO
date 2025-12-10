"""
Voice Navigation API Server
Wraps voice_navigation_local.py as a FastAPI endpoint for frontend integration
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import soundfile as sf
import io
import json
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Import after path is set
try:
    from voice_navigation_local import (
        transcribe_audio,
        run_agent_logic,
        session_state,
        reset_session,
        SAMPLE_RATE
    )
    print("✅ Voice navigation module imported successfully")
except Exception as e:
    print(f"❌ Failed to import voice_navigation_local: {e}")
    import traceback
    traceback.print_exc()
    # Create dummy functions for testing
    SAMPLE_RATE = 16000
    session_state = {"step": "IDLE"}
    def transcribe_audio(audio): return "Transcription unavailable"
    def run_agent_logic(text, ic=""): return {"reply": "Service unavailable", "lang": "BM", "continue_conversation": False}
    def reset_session(): pass

app = FastAPI(title="Voice Navigation API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "Voice Navigation API Running", "session": session_state}

@app.post("/voice/process")
async def process_voice(
    audio: UploadFile = File(...),
    user_ic: str = "900101012345"
):
    """
    Process voice audio and return AI response
    
    Request:
    - audio: WAV file (multipart/form-data)
    - user_ic: User IC number (form field)
    
    Response:
    {
        "transcript": "user's speech text",
        "reply": "AI response text",
        "language": "BM/BC/BI",
        "continue_conversation": true/false,
        "navigate_to": "str" | null,
        "session_state": {...}
    }
    """
    try:
        # Read uploaded audio file
        audio_bytes = await audio.read()
        audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)
        
        # Resample if needed
        if sample_rate != SAMPLE_RATE:
            import librosa
            audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=SAMPLE_RATE)
        
        # Ensure float32
        audio_data = audio_data.astype(np.float32)
        
        # Transcribe
        transcript = transcribe_audio(audio_data)
        print(f"[API] Transcribed: {transcript}")
        
        # Run agent logic
        result = run_agent_logic(transcript, user_ic)
        
        # Add transcript and session state to response
        result["transcript"] = transcript
        result["session_state"] = session_state.copy()
        
        # Check if there's pending navigation
        if session_state.get("pending_navigation"):
            result["navigate_to"] = session_state["pending_navigation"]
        else:
            result["navigate_to"] = None
        
        return result
        
    except Exception as e:
        print(f"[API] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/reset")
def reset_conversation():
    """Reset conversation state"""
    reset_session()
    return {"status": "Session reset", "session_state": session_state}

@app.get("/voice/state")
def get_state():
    """Get current conversation state"""
    return {"session_state": session_state}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🎙️  VOICE NAVIGATION API SERVER")
    print("="*60)
    print("Starting server on http://localhost:8001")
    print("Frontend can now send audio to /voice/process")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
