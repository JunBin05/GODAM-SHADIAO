"""
Pydantic models for eligibility checking
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class EligibilityRequest(BaseModel):
    """Request model for eligibility checking"""
    ic: str = Field(..., description="IC number")
    age: int = Field(..., description="Age in years")
    monthly_income: float = Field(..., description="Monthly income in RM")
    household_size: int = Field(..., description="Number of people in household")
    state: str = Field(..., description="State of residence")
    disability_status: bool = Field(False, description="Disability status")
    employment_status: str = Field(..., description="Employment status")
    dependents: int = Field(0, description="Number of dependents")
    
    class Config:
        json_schema_extra = {
            "example": {
                "ic": "850101-10-1234",
                "age": 39,
                "monthly_income": 1500.00,
                "household_size": 4,
                "state": "Selangor",
                "disability_status": False,
                "employment_status": "employed",
                "dependents": 2
            }
        }


class EligibilityResponse(BaseModel):
    """Response model for eligibility check"""
    success: bool = True
    eligible: bool = Field(..., description="Whether user is eligible")
    reason: str = Field(..., description="Explanation of eligibility decision")
    estimated_amount: Optional[float] = Field(None, description="Estimated monthly amount if eligible")
    required_documents: Optional[List[str]] = Field(None, description="List of required documents if eligible")
    message: str = "Eligibility check completed"
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "eligible": True,
                "reason": "You meet all eligibility criteria for this program",
                "estimated_amount": 300.00,
                "required_documents": [
                    "Copy of IC",
                    "Latest payslip",
                    "Utility bill (proof of residence)"
                ],
                "message": "Eligibility check completed"
            }
        }
