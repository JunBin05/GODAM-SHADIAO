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

@app.get("/health")
async def health_check():
    return {
        "success": True,
        "status": "healthy",
        "message": "API is operational",
        "model_loaded": True  # For voice login compatibility
    }

# Mock user lookup endpoint for testing login
# Test credentials: IC = "test" or "demo" or any IC from Firebase
@app.get("/user/{ic}")
async def get_user_by_ic(ic: str):
    """Get user by IC number for login verification"""
    # Import Firebase service
    from services.firebase_service import get_user_by_ic as firebase_get_user_by_ic, get_user_by_id
    
    # Mock test users for easy testing (fallback)
    test_users = {
        "test": {"name": "Test User", "icNumber": "test", "language": "en", "hasVoice": True, "hasFace": True},
        "demo": {"name": "Demo User", "icNumber": "demo", "language": "en", "hasVoice": True, "hasFace": True},
        "111": {"name": "Ah Gong (Eligible)", "icNumber": "111", "language": "en", "hasVoice": True, "hasFace": True},
        "222": {"name": "Ah Ma (Not Eligible)", "icNumber": "222", "language": "en", "hasVoice": True, "hasFace": True},
    }
    
    # Check test users first
    if ic in test_users:
        return {"success": True, **test_users[ic]}
    
    # Check Firebase
    try:
        user = firebase_get_user_by_ic(ic)
        if not user:
            # Also try by user_id
            user = get_user_by_id(ic)
        
        if user:
            return {
                "success": True,
                "name": user.get('name', ''),
                "icNumber": user.get('ic', ''),
                "language": user.get('preferred_language', 'en'),
                "hasVoice": bool(user.get('voice_embedding')),
                "hasFace": bool(user.get('face_embedding'))
            }
    except Exception as e:
        print(f"Error loading user from Firebase: {e}")
    
    return {"success": False, "detail": "User not found. Try 'test' or 'demo' for testing."}


# Simple user registration endpoint for frontend
@app.post("/user/register")
async def simple_register(request: dict):
    """Simple registration endpoint for frontend"""
    from services.firebase_service import get_user_by_ic, create_user, get_all_users
    
    ic_number = request.get('icNumber', '')
    name = request.get('name', '')
    language = request.get('language', 'en')
    face_embedding = request.get('faceEmbedding')
    voice_embedding = request.get('voiceEmbedding')
    
    if not ic_number:
        return {"success": False, "detail": "IC number is required"}
    
    # Check if user already exists
    existing_user = get_user_by_ic(ic_number)
    if existing_user:
        return {"success": False, "detail": "User with this IC already exists"}
    
    # Generate new user_id
    users = get_all_users()
    max_user_num = 0
    for user in users:
        try:
            user_num = int(user.get('user_id', 'USR000').replace('USR', ''))
            max_user_num = max(max_user_num, user_num)
        except (ValueError, KeyError):
            continue
    
    new_user_id = f"USR{str(max_user_num + 1).zfill(3)}"
    
    # Create new user
    new_user = {
        "user_id": new_user_id,
        "name": name or f"User {new_user_id}",
        "ic": ic_number,
        "age": 0,  # Will be calculated from IC
        "phone": "",
        "email": "",
        "monthly_income": 0,
        "household_size": 1,
        "state": "",
        "disability_status": False,
        "employment_status": "unknown",
        "dependents": 0,
        "pin": "123456",  # Default PIN
        "face_embedding": str(face_embedding) if face_embedding else None,
        "voice_embedding": str(voice_embedding) if voice_embedding else None,
        "preferred_language": language,
        "enrolled_programs": [],
        "created_date": "2024-12-09"
    }
    
    try:
        create_user(new_user)
        return {
            "success": True,
            "message": "Registration successful",
            "user_id": new_user_id,
            "name": new_user['name']
        }
    except Exception as e:
        print(f"Error creating user: {e}")
        return {"success": False, "detail": str(e)}


# Router registration
from routes import auth, aid, store, payment, reminder, str_application
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(aid.router, prefix="/api/aid", tags=["Aid Programs"])
app.include_router(store.router, prefix="/api/stores", tags=["Store Locator"])
app.include_router(payment.router, prefix="/api/payment", tags=["QR Payment"])
app.include_router(reminder.router, prefix="/api/reminders", tags=["Reminders & Notifications"])
app.include_router(str_application.router, prefix="/api/str-application", tags=["STR Application Helper"])

# Mount voice login routes from load_VoiceLogin_Model
try:
    from load_VoiceLogin_Model import app as voice_app
    # Import the routes directly instead of mounting
    from load_VoiceLogin_Model import (
        health_check as voice_health,
        register_user_data,
        register_voice,
        start_registration,
        confirm_registration,
        cancel_registration,
        login_voice
    )
    # Add voice routes to main app
    app.post("/voice/register")(register_voice)
    app.post("/voice/register/start")(start_registration)
    app.post("/voice/register/confirm")(confirm_registration)
    app.delete("/voice/register/cancel/{user_id}")(cancel_registration)
    app.post("/voice/login")(login_voice)
    print("✓ Voice login routes loaded successfully")
except Exception as e:
    print(f"⚠ Voice login routes not available: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
