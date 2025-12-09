"""
Pydantic models for authentication requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class LoginRequest(BaseModel):
    """Request model for user login"""
    user_id: Optional[str] = Field(None, description="User ID for direct login")
    face_id: Optional[str] = Field(None, description="Face embedding for facial recognition")
    voice_id: Optional[str] = Field(None, description="Voice embedding for voiceprint authentication")
    pin: Optional[str] = Field(None, description="6-digit PIN for fallback authentication")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "USR001",
                "pin": "123456"
            }
        }


class RegisterRequest(BaseModel):
    """Request model for new user registration"""
    name: str = Field(..., description="Full name")
    ic: str = Field(..., description="IC number in format YYMMDD-PB-###G")
    phone: str = Field(..., description="Phone number")
    email: str = Field(..., description="Email address")
    monthly_income: float = Field(..., description="Monthly income in RM")
    household_size: int = Field(..., description="Number of people in household")
    state: str = Field(..., description="State of residence")
    disability_status: bool = Field(False, description="Disability status")
    employment_status: str = Field(..., description="Employment status: employed/unemployed/retired/self-employed/part-time")
    dependents: int = Field(0, description="Number of dependents")
    pin: str = Field(..., description="6-digit PIN")
    face_image: Optional[str] = Field(None, description="Base64 encoded face image for enrollment")
    voice_sample: Optional[str] = Field(None, description="Base64 encoded voice sample for enrollment")
    preferred_language: str = Field("ms", description="Preferred language: en or ms")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Ali bin Ahmad",
                "ic": "850101-10-1234",
                "phone": "012-3456789",
                "email": "ali.ahmad@email.com",
                "monthly_income": 1500.00,
                "household_size": 4,
                "state": "Selangor",
                "disability_status": False,
                "employment_status": "employed",
                "dependents": 2,
                "pin": "123456",
                "preferred_language": "ms"
            }
        }


class AuthResponse(BaseModel):
    """Response model for successful authentication"""
    success: bool = True
    token: str = Field(..., description="JWT access token")
    user_id: str = Field(..., description="User ID")
    name: str = Field(..., description="User's name")
    enrolled_programs: List[str] = Field(..., description="List of enrolled aid programs")
    message: str = Field("Authentication successful", description="Success message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "user_id": "USR001",
                "name": "Ahmad bin Abdullah",
                "enrolled_programs": ["str", "mykasih"],
                "message": "Authentication successful"
            }
        }


class TokenData(BaseModel):
    """Data structure for JWT token payload"""
    user_id: str
    name: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "USR001",
                "name": "Ahmad bin Abdullah"
            }
        }
