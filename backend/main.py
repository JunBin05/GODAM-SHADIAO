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
