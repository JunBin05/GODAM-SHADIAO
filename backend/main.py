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

# User lookup endpoint - IC is the document ID
@app.get("/user/{ic}")
async def get_user_by_ic(ic: str):
    """Get user by IC number (IC is the document ID in MongoDB)"""
    from services.mongodb_service import get_user_by_id
    
    # Mock test users for easy testing (fallback)
    test_users = {
        "test": {"name": "Test User", "icNumber": "test", "language": "en", "hasVoice": True, "hasFace": True},
        "demo": {"name": "Demo User", "icNumber": "demo", "language": "en", "hasVoice": True, "hasFace": True},
    }
    
    # Check test users first
    if ic in test_users:
        return {"success": True, **test_users[ic]}
    
    # Check MongoDB - IC is the _id
    try:
        user = get_user_by_id(ic)
        
        if user:
            return {
                "success": True,
                "name": user.get('name', ''),
                "icNumber": ic,
                "language": user.get('preferred_language', 'en'),
                "hasVoice": bool(user.get('voiceEmbedding')),
                "hasFace": bool(user.get('face_embedding'))
            }
    except Exception as e:
        print(f"Error loading user from MongoDB: {e}")
    
    return {"success": False, "detail": "User not found. Try 'test' or 'demo' for testing."}


# Simple user registration endpoint for frontend
@app.post("/user/register")
async def simple_register(request: dict):
    """Simple registration endpoint for frontend - uses IC as document ID in MongoDB"""
    from services.mongodb_service import get_user_by_id, create_user, update_user
    
    ic_number = request.get('icNumber', '')
    name = request.get('name', '')
    language = request.get('language', 'en')
    face_embedding = request.get('faceEmbedding')
    voice_embedding = request.get('voiceEmbedding')
    
    if not ic_number:
        return {"success": False, "detail": "IC number is required"}
    
    # Check if user already exists (IC is the _id)
    try:
        user = get_user_by_id(ic_number)
        
        if user:
            # Update existing user
            update_data = {}
            if name:
                update_data['name'] = name
            if language:
                update_data['preferred_language'] = language
            if face_embedding:
                update_data['face_embedding'] = face_embedding
            if voice_embedding:
                update_data['voiceEmbedding'] = voice_embedding
            
            if update_data:
                update_user(ic_number, update_data)
            
            return {
                "success": True,
                "message": "User updated",
                "user_id": ic_number,
                "name": name
            }
        else:
            # Create new user with IC as _id
            new_user = {
                "_id": ic_number,
                "name": name or "New User",
                "preferred_language": language,
                "face_embedding": face_embedding if face_embedding else None,
                "voiceEmbedding": voice_embedding if voice_embedding else None,
                "created_date": "2024-12-10"
            }
            
            create_user(new_user)
            return {
                "success": True,
                "message": "Registration successful",
                "user_id": ic_number,
                "name": new_user['name']
            }
    except Exception as e:
        print(f"Error in registration: {e}")
        return {"success": False, "detail": str(e)}


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
