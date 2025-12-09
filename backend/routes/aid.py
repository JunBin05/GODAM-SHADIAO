"""
Aid Program API routes
"""
from fastapi import APIRouter, HTTPException, status
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.aid import AidStatusResponse, ProgramStatus, AidBalance, AidHistoryResponse, Transaction
from models.eligibility import EligibilityRequest, EligibilityResponse
from services.aid_service import get_aid_status, get_aid_balance, get_aid_history
from services.eligibility_service import check_eligibility

router = APIRouter()


@router.get("/status/{user_id}", response_model=AidStatusResponse)
async def get_status(user_id: str):
    """
    Get enrollment status for all 3 aid programs (STR, SARA, MyKasih)
    
    - **user_id**: User ID
    
    Returns enrollment status, application date, and eligibility status for each program.
    """
    programs = get_aid_status(user_id)
    
    if programs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": f"User {user_id} not found",
                "code": "USER_NOT_FOUND"
            }
        )
    
    return AidStatusResponse(
        success=True,
        data=[ProgramStatus(**prog) for prog in programs],
        message="Aid status retrieved successfully"
    )


@router.get("/balance/{user_id}/{program_id}", response_model=AidBalance)
async def get_balance(user_id: str, program_id: str):
    """
    Get current balance for a specific aid program
    
    - **user_id**: User ID
    - **program_id**: Program ID (str, sara, or mykasih)
    
    For MyKasih: Returns current balance, last transaction date, and monthly allocation.
    For STR/SARA: Returns payment amount, last payment date, and next payment date.
    """
    # Validate program_id
    valid_programs = ["str", "sara", "mykasih"]
    if program_id not in valid_programs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": f"Invalid program_id. Must be one of: {', '.join(valid_programs)}",
                "code": "INVALID_PROGRAM"
            }
        )
    
    balance = get_aid_balance(user_id, program_id)
    
    if balance is None:
        # Check if user exists or just not enrolled
        from services.aid_service import get_user_by_id
        user = get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": f"User {user_id} not found",
                    "code": "USER_NOT_FOUND"
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "error": f"You are not enrolled in the {program_id} program",
                    "code": "NOT_ENROLLED"
                }
            )
    
    return AidBalance(**balance)


@router.get("/history/{user_id}/{program_id}", response_model=AidHistoryResponse)
async def get_history(user_id: str, program_id: str):
    """
    Get transaction history for a specific aid program
    
    - **user_id**: User ID
    - **program_id**: Program ID (str, sara, or mykasih)
    
    Returns the last 20 transactions sorted by date (most recent first).
    For users with no transaction history, returns an empty array.
    """
    # Validate program_id
    valid_programs = ["str", "sara", "mykasih"]
    if program_id not in valid_programs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": f"Invalid program_id. Must be one of: {', '.join(valid_programs)}",
                "code": "INVALID_PROGRAM"
            }
        )
    
    transactions = get_aid_history(user_id, program_id)
    
    if transactions is None:
        # Check if user exists or just not enrolled
        from services.aid_service import get_user_by_id
        user = get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": f"User {user_id} not found",
                    "code": "USER_NOT_FOUND"
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "error": f"You are not enrolled in the {program_id} program",
                    "code": "NOT_ENROLLED"
                }
            )
    
    # Return transactions (empty array if no history)
    return AidHistoryResponse(
        success=True,
        data=[Transaction(**txn) for txn in transactions],
        message="Transaction history retrieved successfully"
    )


@router.post("/check-eligibility/{program_id}", response_model=EligibilityResponse)
async def check_program_eligibility(program_id: str, request: EligibilityRequest):
    """
    Check eligibility for a specific aid program
    
    - **program_id**: Program ID (str, sara, or mykasih)
    - **Request body**: User profile data (IC, age, income, household size, etc.)
    
    Returns eligibility decision with reason, estimated amount if eligible, and required documents.
    """
    # Validate program_id
    valid_programs = ["str", "sara", "mykasih"]
    if program_id not in valid_programs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": f"Invalid program_id. Must be one of: {', '.join(valid_programs)}",
                "code": "INVALID_PROGRAM"
            }
        )
    
    # Validate required fields
    if not request.ic or not request.monthly_income or not request.age:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": "Missing required fields: ic, age, monthly_income",
                "code": "MISSING_FIELD"
            }
        )
    
    # Check eligibility
    user_profile = request.model_dump()
    result = check_eligibility(program_id, user_profile)
    
    return EligibilityResponse(
        success=True,
        eligible=result['eligible'],
        reason=result['reason'],
        estimated_amount=result['estimated_amount'],
        required_documents=result['required_documents'],
        message="Eligibility check completed"
    )
