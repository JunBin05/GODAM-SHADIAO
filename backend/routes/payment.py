from fastapi import APIRouter, HTTPException, status
from models.payment import (
    QRGenerateRequest, QRGenerateResponse,
    QRVerifyRequest, PaymentReceipt, PaymentReceiptResponse
)
from services.payment_service import (
    generate_qr_code, verify_qr_code, get_user_balance, get_store_by_id
)

router = APIRouter()


@router.post("/generate-qr", response_model=QRGenerateResponse)
async def generate_payment_qr(request: QRGenerateRequest):
    """
    Generate QR code for payment at a store.
    
    - **user_id**: User making the payment
    - **program_id**: Aid program (str, sara, mykasih)
    - **amount**: Payment amount in RM (must be positive)
    - **store_id**: Store where payment will be made
    
    Returns base64-encoded QR code image valid for 5 minutes.
    """
    # Validate program ID
    valid_programs = ["str", "sara", "mykasih"]
    if request.program_id not in valid_programs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": f"Invalid program_id. Must be one of: {', '.join(valid_programs)}",
                "code": "INVALID_PROGRAM"
            }
        )
    
    # Validate store exists
    store = get_store_by_id(request.store_id)
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": f"Store with ID '{request.store_id}' not found",
                "code": "STORE_NOT_FOUND"
            }
        )
    
    # Check user balance
    current_balance = get_user_balance(request.user_id, request.program_id)
    
    if current_balance is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": f"User {request.user_id} is not enrolled in {request.program_id} program",
                "code": "NOT_ENROLLED"
            }
        )
    
    if current_balance < request.amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "success": False,
                "error": f"Insufficient balance. Available: RM{current_balance:.2f}, Required: RM{request.amount:.2f}",
                "code": "INSUFFICIENT_BALANCE"
            }
        )
    
    # Generate QR code
    try:
        qr_code_base64, transaction_id, expires_at, signature = generate_qr_code(
            user_id=request.user_id,
            program_id=request.program_id,
            amount=request.amount,
            store_id=request.store_id
        )
        
        return QRGenerateResponse(
            success=True,
            qr_code_data=qr_code_base64,
            transaction_id=transaction_id,
            expires_at=expires_at.isoformat(),
            amount=request.amount,
            message="QR code generated successfully. Valid for 5 minutes."
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": f"Failed to generate QR code: {str(e)}",
                "code": "QR_GENERATION_FAILED"
            }
        )


@router.post("/verify-qr", response_model=PaymentReceiptResponse)
async def verify_payment_qr(request: QRVerifyRequest):
    """
    Verify QR code and process payment.
    
    - **transaction_id**: Transaction ID from scanned QR code
    - **store_id**: Store ID processing the payment
    - **signature**: QR code signature for validation
    
    Returns payment receipt if successful, deducts balance, and creates transaction record.
    """
    # Verify QR code and process payment
    success, message, payment_data = verify_qr_code(
        transaction_id=request.transaction_id,
        store_id=request.store_id,
        signature=request.signature
    )
    
    if not success:
        # Determine appropriate status code
        if "expired" in message.lower():
            status_code = status.HTTP_410_GONE
            error_code = "QR_EXPIRED"
        elif "invalid" in message.lower() or "signature" in message.lower():
            status_code = status.HTTP_400_BAD_REQUEST
            error_code = "INVALID_QR"
        elif "insufficient" in message.lower():
            status_code = status.HTTP_402_PAYMENT_REQUIRED
            error_code = "INSUFFICIENT_BALANCE"
        elif "not enrolled" in message.lower():
            status_code = status.HTTP_403_FORBIDDEN
            error_code = "NOT_ENROLLED"
        else:
            status_code = status.HTTP_400_BAD_REQUEST
            error_code = "PAYMENT_FAILED"
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error": message,
                "code": error_code
            }
        )
    
    # Payment successful
    return PaymentReceiptResponse(
        success=True,
        data=PaymentReceipt(**payment_data),
        message=message
    )


@router.get("/balance/{user_id}/{program_id}")
async def check_payment_balance(user_id: str, program_id: str):
    """
    Check user's available balance for payment.
    
    - **user_id**: User identifier
    - **program_id**: Aid program (str, sara, mykasih)
    
    Returns current balance available for QR payment.
    """
    # Validate program ID
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
    
    # Get balance
    balance = get_user_balance(user_id, program_id)
    
    if balance is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": f"User {user_id} is not enrolled in {program_id} program",
                "code": "NOT_ENROLLED"
            }
        )
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "program_id": program_id,
            "available_balance": balance
        },
        "message": "Balance retrieved successfully"
    }
