"""
MyID Voice Assistant - Backend API
Main FastAPI application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(
    title="MyID Voice Assistant API",
    description="Backend APIs for Government Aid Access for Elderly & Disabled Malaysians",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "success": True,
        "message": "MyID Voice Assistant Backend API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/health")
async def health_check():
    return {
        "success": True,
        "status": "healthy",
        "message": "API is operational",
    }



# Full user profile endpoint for forms (returns all fields including family)
@app.get("/api/auth/user/{ic}")
async def get_full_user_profile(ic: str):
    """Get complete user profile for form pre-filling including family data"""
    from services.mongodb_service import get_user_by_id
    
    try:
        user = get_user_by_id(ic)
        
        if user:
            # Return full user data for form pre-filling
            return {
                "success": True,
                "data": {
                    "ic": ic,
                    "name": user.get('name', ''),
                    "preferred_language": user.get('preferred_language', 'en'),
                    "monthly_income": user.get('monthly_income'),
                    "marital_status": user.get('marital_status', 'single'),
                    "state": user.get('state', ''),
                    "spouse": user.get('spouse'),
                    "children": user.get('children', []),
                    "guardian": user.get('guardian'),
                    "hasVoice": bool(user.get('voiceEmbedding')),
                    "hasFace": bool(user.get('face_embedding'))
                }
            }
    except Exception as e:
        print(f"Error loading user profile: {e}")
        return {"success": False, "detail": str(e)}
    
    return {"success": False, "detail": "User not found"}



# Financial Aid Eligibility endpoint - fetches from Firebase financialAid collection
@app.get("/api/financial-aid/{ic}")
async def get_financial_aid(ic: str):
    """Get financial aid eligibility from MongoDB financialAid collection"""
    from services.mongodb_service import get_financial_aid as get_financial_aid_data
    
    try:
        data = get_financial_aid_data(ic)
        
        if data:
            return {
                "success": True,
                "ic": ic,
                "mykasih_eligible": data.get('mykasih_eligible', False),
                "str_eligible": data.get('str_eligible', False),
                "mykasih_balance": data.get('mykasih_balance_not_expire', 0),
                "mykasih_expire_balance": data.get('mykasih_expire__balance', 0),
                "mykasih_start_date": str(data.get('mykasih_start_date', '')),
                "mykasih_expire_date": str(data.get('mykasih_expire_date', '')),
                "mykasih_history": data.get('mykasih_history', []),
                "str_next_pay_date": str(data.get('str_nextPayDate', '')),
                "str_next_pay_amount": data.get('str_nextPayAmount', 0),
                "str_remaining_cycles": data.get('str_remainingCycles', 0),
                "str_history": data.get('str_history', [])
            }
        else:
            return {
                "success": True,
                "ic": ic,
                "mykasih_eligible": False,
                "str_eligible": False
            }
    except Exception as e:
        print(f"Error fetching financial aid: {e}")
        return {"success": False, "detail": str(e)}


# Router registration - DISABLED: These still use Firebase which is exhausted

from routes import user
app.include_router(user.router, prefix="/api/user", tags=["User Management"])

# TODO: Update these services to use MongoDB
# try:
#     from routes import auth, aid, store, payment, reminder, str_application
#     app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
#     app.include_router(aid.router, prefix="/api/aid", tags=["Aid Programs"])
#     app.include_router(store.router, prefix="/api/stores", tags=["Store Locator"])
#     app.include_router(payment.router, prefix="/api/payment", tags=["QR Payment"])
#     app.include_router(reminder.router, prefix="/api/reminders", tags=["Reminders & Notifications"])
#     app.include_router(str_application.router, prefix="/api/str-application", tags=["STR Application Helper"])
#     print("✓ Additional routes loaded")
# except Exception as e:
#     print(f"⚠ Additional routes not loaded: {e}")

# Mount voice login routes from load_VoiceLogin_Model
# try:
#     from load_VoiceLogin_Model import app as voice_app
#     # Import the routes directly instead of mounting
#     from load_VoiceLogin_Model import (
#         health_check as voice_health,
#         register_user_data,
#         register_voice,
#         start_registration,
#         confirm_registration,
#         cancel_registration,
#         login_voice
#     )
#     # Add voice routes to main app
#     app.post("/voice/register")(register_voice)
#     app.post("/voice/register/start")(start_registration)
#     app.post("/voice/register/confirm")(confirm_registration)
#     app.delete("/voice/register/cancel/{user_id}")(cancel_registration)
#     app.post("/voice/login")(login_voice)
#     print("✓ Voice login routes loaded successfully")
# except Exception as e:
#     print(f"⚠ Voice login routes not available: {e}")

# Mount voice navigation API
try:
    from fastapi import UploadFile, File, Form
    import sys
    import os
    voice_path = os.path.join(os.path.dirname(__file__), "..", "voice-login")
    sys.path.insert(0, voice_path)
    
    # Import voice navigation module (no auto-load)
    from voice_navigation_module import (
        load_whisper_model,
        transcribe_audio,
        run_agent_logic,
        session_state,
        reset_session,
        SAMPLE_RATE
    )
    
    # Load Whisper model at startup
    print("\n" + "🔊 "*30)
    print("STARTING VOICE NAVIGATION MODULE")
    print("🔊 "*30 + "\n")
    
    model_loaded = load_whisper_model()
    
    if model_loaded:
        @app.post("/voice/process")
        async def process_voice_navigation(
            audio: UploadFile = File(...),
            user_ic: str = Form(default="900101012345")
        ):
            """Process voice audio for navigation"""
            import numpy as np
            import soundfile as sf
            import io
            
            try:
                # Read audio
                audio_bytes = await audio.read()
                audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
                
                # Convert to mono
                if len(audio_data.shape) > 1:
                    audio_data = audio_data.mean(axis=1)
                
                # Resample if needed
                if sample_rate != SAMPLE_RATE:
                    import librosa
                    audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=SAMPLE_RATE)
                
                audio_data = audio_data.astype(np.float32)
                
                # Transcribe
                print(f"🎙️ Transcribing audio for IC: {user_ic}")
                transcript = transcribe_audio(audio_data)
                print(f"   Transcript: {transcript}")
                
                # Get AI response
                result = run_agent_logic(transcript, user_ic)
                result["transcript"] = transcript
                result["session_state"] = session_state.copy()
                # Note: navigate_to is only returned by run_agent_logic when user confirms
                
                print(f"   AI Reply: {result['reply']}")
                return result
            except Exception as e:
                print(f"❌ Voice processing error: {e}")
                import traceback
                traceback.print_exc()
                from fastapi import HTTPException
                raise HTTPException(status_code=500, detail=str(e))
        
        @app.post("/voice/reset")
        async def reset_voice_navigation():
            """Reset voice navigation session"""
            reset_session()
            return {"status": "Session reset", "session_state": session_state}
        
        @app.post("/voice/transcribe")
        async def transcribe_voice(audio: UploadFile = File(...)):
            """Simple transcription endpoint for form filling"""
            import numpy as np
            import soundfile as sf
            import io
            
            try:
                audio_bytes = await audio.read()
                audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
                
                if len(audio_data.shape) > 1:
                    audio_data = audio_data.mean(axis=1)
                
                if sample_rate != SAMPLE_RATE:
                    import librosa
                    audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=SAMPLE_RATE)
                
                audio_data = audio_data.astype(np.float32)
                
                print(f"🎙️ Transcribing audio for form...")
                transcript = transcribe_audio(audio_data)
                print(f"   Transcript: {transcript}")
                
                return {"success": True, "transcription": transcript}
            except Exception as e:
                print(f"❌ Transcription error: {e}")
                return {"success": False, "error": str(e)}
        
        print("\n" + "✅ "*30)
        print("VOICE NAVIGATION: FULLY OPERATIONAL")
        print("✅ "*30)
        print("• Endpoints: /voice/process, /voice/reset")
        print("• Malaysian Whisper Model: LOADED")
        print("• Supported: Malay, English, Chinese")
        print("• Recognition: STR, MyKasih, SARA optimized")
        print("="*70 + "\n")
    else:
        print("\n⚠️  Voice navigation running in fallback mode (model load failed)\n")
    
except Exception as e:
    print(f"⚠ Voice navigation API not loaded: {e}")
    import traceback
    traceback.print_exc()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
