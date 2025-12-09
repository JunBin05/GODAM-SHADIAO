"""
Authentication API routes
"""
from fastapi import APIRouter, HTTPException, status
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.auth import LoginRequest, RegisterRequest, AuthResponse
from services.auth_service import (
    authenticate_by_pin,
    authenticate_by_face,
    authenticate_by_voice,
    check_ic_exists,
    validate_ic_format,
    create_new_user
)
from utils.jwt_handler import create_access_token

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Authenticate user with PIN, face recognition, or voiceprint
    
    - **user_id**: User ID (required with PIN)
    - **pin**: 6-digit PIN for authentication
    - **face_id**: Face embedding for facial recognition
    - **voice_id**: Voice embedding for voiceprint authentication
    """
    user = None
    
    # Try PIN authentication
    if request.user_id and request.pin:
        user = authenticate_by_pin(request.user_id, request.pin)
    
    # Try face authentication
    elif request.face_id:
        user = authenticate_by_face(request.face_id)
    
    # Try voice authentication
    elif request.voice_id:
        user = authenticate_by_voice(request.voice_id)
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": "Please provide either (user_id + pin), face_id, or voice_id",
                "code": "MISSING_CREDENTIALS"
            }
        )
    
    # Check if authentication failed
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": "Invalid credentials",
                "code": "AUTHENTICATION_FAILED"
            }
        )
    
    # Generate JWT token
    token_data = {
        "user_id": user['user_id'],
        "name": user['name']
    }
    access_token = create_access_token(token_data)
    
    # Return success response
    return AuthResponse(
        success=True,
        token=access_token,
        user_id=user['user_id'],
        name=user['name'],
        enrolled_programs=user['enrolled_programs'],
        message="Authentication successful"
    )


@router.post("/register")
async def register(request: RegisterRequest):
    """
    Register a new user in the system
    
    - **name**: Full name
    - **ic**: IC number in format YYMMDD-PB-###G
    - **phone**: Phone number
    - **email**: Email address
    - **monthly_income**: Monthly income in RM
    - **household_size**: Number of people in household
    - **state**: State of residence
    - **disability_status**: Disability status (true/false)
    - **employment_status**: Employment status
    - **dependents**: Number of dependents
    - **pin**: 6-digit PIN for authentication
    - **face_image**: Optional base64 encoded face image
    - **voice_sample**: Optional base64 encoded voice sample
    - **preferred_language**: Preferred language (en or ms)
    """
    
    # Validate IC format
    if not validate_ic_format(request.ic):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": "Invalid IC number format. Expected format: YYMMDD-PB-###G",
                "code": "INVALID_IC"
            }
        )
    
    # Check if IC already exists
    if check_ic_exists(request.ic):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "success": False,
                "error": "User with this IC number already exists",
                "code": "DUPLICATE_USER"
            }
        )
    
    # Create new user
    user_data = request.model_dump()
    new_user = create_new_user(user_data)
    
    # Generate JWT token for auto-login
    token_data = {
        "user_id": new_user['user_id'],
        "name": new_user['name']
    }
    access_token = create_access_token(token_data)
    
    # Return success response
    return {
        "success": True,
        "message": "Registration successful",
        "data": {
            "user_id": new_user['user_id'],
            "name": new_user['name'],
            "token": access_token,
            "enrolled_programs": new_user['enrolled_programs']
        }
    }
