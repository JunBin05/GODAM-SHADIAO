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
        "message": "API is operational"
    }

# Mock user lookup endpoint for testing login
# Test credentials: IC = "test" or "demo" or any IC from mock_users.json
@app.get("/user/{ic}")
async def get_user_by_ic(ic: str):
    """Get user by IC number for login verification"""
    import json
    import os
    
    # Mock test users for easy testing
    test_users = {
        "test": {"name": "Test User", "icNumber": "test", "language": "en", "hasVoice": True, "hasFace": True},
        "demo": {"name": "Demo User", "icNumber": "demo", "language": "en", "hasVoice": True, "hasFace": True},
        "111": {"name": "Ah Gong (Eligible)", "icNumber": "111", "language": "en", "hasVoice": True, "hasFace": True},
        "222": {"name": "Ah Ma (Not Eligible)", "icNumber": "222", "language": "en", "hasVoice": True, "hasFace": True},
    }
    
    # Check test users first
    if ic in test_users:
        return {"success": True, **test_users[ic]}
    
    # Check mock_users.json
    try:
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        with open(os.path.join(data_dir, 'mock_users.json'), 'r', encoding='utf-8') as f:
            data = json.load(f)
            for user in data['users']:
                if user['ic'] == ic or user['user_id'] == ic:
                    return {
                        "success": True,
                        "name": user['name'],
                        "icNumber": user['ic'],
                        "language": user.get('preferred_language', 'en'),
                        "hasVoice": bool(user.get('voice_embedding')),
                        "hasFace": bool(user.get('face_embedding'))
                    }
    except Exception as e:
        print(f"Error loading mock users: {e}")
    
    return {"success": False, "detail": "User not found. Try 'test' or 'demo' for testing."}

# Router registration
from routes import auth, aid, store, payment, reminder, str_application
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(aid.router, prefix="/api/aid", tags=["Aid Programs"])
app.include_router(store.router, prefix="/api/stores", tags=["Store Locator"])
app.include_router(payment.router, prefix="/api/payment", tags=["QR Payment"])
app.include_router(reminder.router, prefix="/api/reminders", tags=["Reminders & Notifications"])
app.include_router(str_application.router, prefix="/api/str-application", tags=["STR Application Helper"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
