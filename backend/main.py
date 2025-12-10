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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
