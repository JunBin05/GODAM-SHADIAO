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


# Update user language preference
@app.post("/api/user/update-language")
async def update_user_language(request: dict):
    """Update user's preferred language in MongoDB"""
    from services.mongodb_service import update_user, get_user_by_id
    
    try:
        ic = request.get('ic')
        language = request.get('language')
        
        if not ic:
            return {"success": False, "detail": "IC number is required"}
        
        if not language:
            return {"success": False, "detail": "Language is required"}
        
        # Validate language code
        valid_languages = ['ms', 'en', 'zh', 'HK', 'hk', 'zh-HK', 'ta']
        if language not in valid_languages:
            return {"success": False, "detail": f"Invalid language. Must be one of: {valid_languages}"}
        
        # Check if user exists
        user = get_user_by_id(ic)
        if not user:
            return {"success": False, "detail": "User not found"}
        
        # Update language
        update_user(ic, {'preferred_language': language})
        
        print(f"✅ Updated language for IC {ic}: {language}")
        
        return {
            "success": True,
            "message": "Language preference updated successfully",
            "ic": ic,
            "language": language
        }
    
    except Exception as e:
        print(f"❌ Error updating language: {e}")
        return {"success": False, "detail": str(e)}


# Router registration - DISABLED: These still use Firebase which is exhausted

# Temporarily disabled facial recognition due to Python 3.13 incompatibility with numpy<2.0
# TODO: Install Visual Studio Build Tools or downgrade to Python 3.11 to enable facial recognition
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
#     # Add voice routes to main app (with /api prefix to match frontend)
#     app.post("/api/voice/register")(register_voice)
#     app.post("/api/voice/register/start")(start_registration)
#     app.post("/api/voice/register/confirm")(confirm_registration)
#     app.delete("/api/voice/register/cancel/{user_id}")(cancel_registration)
#     app.post("/api/voice/login")(login_voice)
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
                
                # NOTE: We NO LONGER pass language hint to Whisper
                # Forcing a language hint (e.g., 'zh' for Cantonese users) causes hallucinations
                # when the user speaks a different language than their UI preference.
                # Let Whisper auto-detect the spoken language for best results.
                print(f"🎙️ Transcribing audio for IC: {user_ic}")
                transcript = transcribe_audio(audio_data, language=None)  # Auto-detect language
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
            import subprocess
            import tempfile
            import os
            
            try:
                audio_bytes = await audio.read()
                filename = audio.filename or "audio.wav"
                
                # Check if it's webm format (needs conversion via ffmpeg)
                if filename.endswith('.webm') or b'webm' in audio_bytes[:50]:
                    print("🔄 Converting webm to wav using ffmpeg...")
                    # Use ffmpeg to convert webm to wav
                    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as webm_file:
                        webm_file.write(audio_bytes)
                        webm_path = webm_file.name
                    
                    wav_path = webm_path.replace('.webm', '.wav')
                    try:
                        result = subprocess.run([
                            'ffmpeg', '-y', '-i', webm_path, 
                            '-ar', '16000', '-ac', '1', '-f', 'wav', wav_path
                        ], capture_output=True, text=True, timeout=10)
                        
                        if result.returncode != 0:
                            print(f"❌ FFmpeg error: {result.stderr}")
                            raise Exception(f"FFmpeg conversion failed: {result.stderr}")
                        
                        audio_data, sample_rate = sf.read(wav_path)
                    finally:
                        # Clean up temp files
                        if os.path.exists(webm_path):
                            os.unlink(webm_path)
                        if os.path.exists(wav_path):
                            os.unlink(wav_path)
                else:
                    # Direct wav/other format
                    audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
                
                if len(audio_data.shape) > 1:
                    audio_data = audio_data.mean(axis=1)
                
                if sample_rate != SAMPLE_RATE:
                    import librosa
                    audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=SAMPLE_RATE)
                
                audio_data = audio_data.astype(np.float32)
                
                print(f"🎙️ Transcribing audio for form...")
                transcript = transcribe_audio(audio_data, language=None)  # Auto-detect language
                print(f"   Transcript: {transcript}")
                
                # Check for hallucination (repeated patterns like "STR.com.com.com")
                import re
                def is_hallucination(text):
                    if not text:
                        return False
                    # Check for repeated .com or similar patterns
                    if re.search(r'(\.\w+){4,}', text):
                        return True
                    # Check for any short pattern repeated 4+ times
                    if re.search(r'(.{1,6})\1{3,}', text.lower()):
                        return True
                    # Check for repeated characters
                    if re.search(r'(.)\1{4,}', text):
                        return True
                    return False
                
                if is_hallucination(transcript):
                    print(f"   🚨 HALLUCINATION DETECTED, ignoring: {transcript[:50]}...")
                    return {"success": True, "transcription": ""}  # Return empty
                
                return {"success": True, "transcription": transcript}
            except Exception as e:
                print(f"❌ Transcription error: {e}")
                return {"success": False, "error": str(e)}
        
        @app.post("/voice/extract-field")
        async def extract_field_value(request: dict):
            """
            Use Gemini to intelligently extract field value from natural speech.
            Example: "Yes my name is Lim Jun Bin" -> "Lim Jun Bin" for name field
            """
            try:
                transcript = request.get("transcript", "")
                field_name = request.get("field_name", "")  # e.g., "name", "phone", "address"
                field_type = request.get("field_type", "text")  # text, phone, email, number, select
                language = request.get("language", "en")
                
                if not transcript:
                    return {"success": False, "error": "No transcript provided"}
                
                # Use Gemini to extract the relevant value
                import google.generativeai as genai
                
                prompt = f"""Extract ONLY the {field_name} value from this user speech. 
The user is filling a form and responding to a question about their {field_name}.

User said: "{transcript}"
Field type: {field_type}
Language context: {language}

Rules:
1. Extract ONLY the actual {field_name} value, not filler words
2. For names: extract the full name (e.g., "my name is John Doe" -> "John Doe")
3. For phone numbers: extract digits only (e.g., "my number is 012 345 6789" -> "0123456789")
4. For addresses: extract the complete address
5. For IC numbers: extract 12 digits (e.g., "my IC 990101-01-1234" -> "990101011234")
6. For yes/no confirmations: return "yes" or "no"
7. For marital status: return one of: single, married, divorced, widowed
8. Remove politeness phrases like "yes", "okay", "my name is", "it's", etc.
9. If you cannot find a valid {field_name}, return empty string ""

Return ONLY the extracted value, nothing else. No quotes, no explanation."""

                model = genai.GenerativeModel("gemini-2.0-flash")
                response = model.generate_content(prompt)
                extracted = response.text.strip().strip('"').strip("'")
                
                # Clean up common issues
                extracted = extracted.replace('\n', ' ').strip()
                
                # For phone/IC, remove non-digits
                if field_type in ['phone', 'tel']:
                    extracted = ''.join(c for c in extracted if c.isdigit())
                elif field_name.lower() in ['ic', 'ic number', 'nric']:
                    extracted = ''.join(c for c in extracted if c.isdigit())
                
                print(f"   🧠 Gemini extracted '{field_name}': '{transcript}' -> '{extracted}'")
                
                return {
                    "success": True, 
                    "extracted": extracted,
                    "original": transcript
                }
            except Exception as e:
                print(f"❌ Field extraction error: {e}")
                # Fallback: return original transcript
                return {"success": True, "extracted": transcript, "original": transcript}
        
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
