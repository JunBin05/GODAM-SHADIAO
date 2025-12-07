"""
Pydantic models for Aid program endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class ProgramStatus(BaseModel):
    """Status for a single aid program"""
    program_id: str = Field(..., description="Program ID: str, sara, or mykasih")
    program_name: str = Field(..., description="Program name")
    enrollment_status: str = Field(..., description="enrolled, not_enrolled, or pending")
    application_date: Optional[str] = Field(None, description="Date of application")
    eligibility_status: Optional[str] = Field(None, description="Eligibility status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "program_id": "str",
                "program_name": "Sumbangan Tunai Rahmah",
                "enrollment_status": "enrolled",
                "application_date": "2024-01-15",
                "eligibility_status": "approved"
            }
        }


class AidStatusResponse(BaseModel):
    """Response for aid status endpoint"""
    success: bool = True
    data: List[ProgramStatus]
    message: str = "Aid status retrieved successfully"


class AidBalance(BaseModel):
    """Balance information for an aid program"""
    program_id: str
    program_name: str
    current_balance: Optional[float] = Field(None, description="Current balance for MyKasih")
    payment_amount: Optional[float] = Field(None, description="Payment amount for STR/SARA")
    last_payment_date: Optional[str] = Field(None, description="Last payment/transaction date")
    next_payment_date: Optional[str] = Field(None, description="Next payment date for STR/SARA")
    monthly_allocation: Optional[float] = Field(None, description="Monthly allocation for MyKasih")
    
    class Config:
        json_schema_extra = {
            "example": {
                "program_id": "mykasih",
                "program_name": "MyKasih",
                "current_balance": 154.50,
                "last_payment_date": "2024-11-15",
                "monthly_allocation": 200.00
            }
        }


class Transaction(BaseModel):
    """Single transaction record"""
    date: str = Field(..., description="Transaction date")
    amount: float = Field(..., description="Transaction amount (negative for spending)")
    description: str = Field(..., description="Transaction description")
    store_name: Optional[str] = Field(None, description="Store name for MyKasih transactions")
    balance_after: Optional[float] = Field(None, description="Balance after transaction")
    
    class Config:
        json_schema_extra = {
            "example": {
                "date": "2024-11-15",
                "amount": -45.50,
                "description": "Groceries",
                "store_name": "99 Speedmart Petaling Jaya",
                "balance_after": 154.50
            }
        }


class AidHistoryResponse(BaseModel):
    """Response for transaction history"""
    success: bool = True
    data: List[Transaction]
    message: str = "Transaction history retrieved successfully"
