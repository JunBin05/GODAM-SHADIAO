from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class QRGenerateRequest(BaseModel):
    """Request model for QR code generation"""
    user_id: str = Field(..., description="User ID making the payment")
    program_id: str = Field(..., description="Aid program ID (str, sara, mykasih)")
    amount: float = Field(..., description="Payment amount in RM", gt=0)
    store_id: str = Field(..., description="Store ID where payment will be made")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "user_id": "USR001",
                "program_id": "mykasih",
                "amount": 25.50,
                "store_id": "STORE001"
            }
        }
    }


class QRGenerateResponse(BaseModel):
    """Response model for QR code generation"""
    success: bool = Field(True, description="API call success status")
    qr_code_data: str = Field(..., description="Base64 encoded QR code image")
    transaction_id: str = Field(..., description="Unique transaction identifier")
    expires_at: str = Field(..., description="QR code expiration timestamp (ISO format)")
    amount: float = Field(..., description="Payment amount")
    message: str = Field(..., description="Response message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "qr_code_data": "iVBORw0KGgoAAAANSUhEUgAA...",
                "transaction_id": "TXN-20251207-001",
                "expires_at": "2025-12-07T10:35:00",
                "amount": 25.50,
                "message": "QR code generated successfully. Valid for 5 minutes."
            }
        }
    }


class QRVerifyRequest(BaseModel):
    """Request model for QR code verification and payment processing"""
    transaction_id: str = Field(..., description="Transaction ID from QR code")
    store_id: str = Field(..., description="Store ID processing the payment")
    signature: str = Field(..., description="QR code signature for validation")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "transaction_id": "TXN-20251207-001",
                "store_id": "STORE001",
                "signature": "a8f5e2c9d4b1..."
            }
        }
    }


class PaymentReceipt(BaseModel):
    """Payment receipt model"""
    transaction_id: str = Field(..., description="Transaction identifier")
    user_id: str = Field(..., description="User ID")
    program_id: str = Field(..., description="Aid program ID")
    amount: float = Field(..., description="Payment amount")
    store_name: str = Field(..., description="Store name")
    store_address: str = Field(..., description="Store address")
    timestamp: str = Field(..., description="Transaction timestamp (ISO format)")
    previous_balance: float = Field(..., description="Balance before transaction")
    new_balance: float = Field(..., description="Balance after transaction")
    status: str = Field(..., description="Transaction status (success/failed)")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "transaction_id": "TXN-20251207-001",
                "user_id": "USR001",
                "program_id": "mykasih",
                "amount": 25.50,
                "store_name": "99 Speedmart Petaling Jaya",
                "store_address": "Jalan SS 2/24, Petaling Jaya",
                "timestamp": "2025-12-07T10:30:45",
                "previous_balance": 150.00,
                "new_balance": 124.50,
                "status": "success"
            }
        }
    }


class PaymentReceiptResponse(BaseModel):
    """Response model for payment verification"""
    success: bool = Field(True, description="Payment success status")
    data: PaymentReceipt = Field(..., description="Payment receipt details")
    message: str = Field(..., description="Response message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "data": {
                    "transaction_id": "TXN-20251207-001",
                    "user_id": "USR001",
                    "program_id": "mykasih",
                    "amount": 25.50,
                    "store_name": "99 Speedmart Petaling Jaya",
                    "store_address": "Jalan SS 2/24, Petaling Jaya",
                    "timestamp": "2025-12-07T10:30:45",
                    "previous_balance": 150.00,
                    "new_balance": 124.50,
                    "status": "success"
                },
                "message": "Payment processed successfully"
            }
        }
    }
