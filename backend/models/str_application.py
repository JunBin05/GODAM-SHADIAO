"""
STR Application Models
Structures for collecting STR 2026 application data
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import date
from enum import Enum


class MaritalStatus(str, Enum):
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    SINGLE = "single"


class IDType(str, Enum):
    MYKAD = "mykad"
    MYPR = "mypr"
    MYKAS = "mykas"
    MYKID = "mykid"
    BIRTH_CERT = "birth_cert"
    PASSPORT = "passport"


class Occupation(str, Enum):
    EMPLOYED = "employed"
    SELF_EMPLOYED = "self_employed"
    UNEMPLOYED = "unemployed"
    STUDENT = "student"
    RETIRED = "retired"
    HOMEMAKER = "homemaker"


class ChildStatus(str, Enum):
    BIOLOGICAL = "biological"
    ADOPTED = "adopted"


class GuardianRelationship(str, Enum):
    SPOUSE = "spouse"
    PARENT = "parent"
    CHILD = "child"
    SIBLING = "sibling"
    GRANDCHILD = "grandchild"


# Applicant Information
class ApplicantInfo(BaseModel):
    ic_number: str = Field(..., description="MyKad/IC number")
    name: str = Field(..., description="Full name (auto from JPN)")
    age: int = Field(..., description="Age (auto from JPN)")
    gender: str = Field(..., description="Gender (auto from JPN)")
    phone_home: Optional[str] = Field(None, description="Home phone number")
    phone_mobile: str = Field(..., description="Mobile phone number")
    occupation: Occupation
    household_monthly_income: float = Field(..., description="Gross household monthly income")
    marital_status: MaritalStatus
    marital_date: Optional[date] = Field(None, description="Date of marriage/divorce/spouse death")
    address: str = Field(..., description="Mailing address")
    postcode: str = Field(..., description="Postcode")
    city: str = Field(..., description="City (auto from postcode)")
    state: str = Field(..., description="State (auto from postcode)")
    bank_name: str = Field(..., description="Bank name (active bank)")
    bank_account: str = Field(..., description="Bank account number")
    email: EmailStr = Field(..., description="Email address")


# Spouse Information (if married)
class SpouseInfo(BaseModel):
    id_type: IDType
    id_number: str = Field(..., description="Identification number")
    name: str = Field(..., description="Full name")
    gender: Optional[str] = Field(None, description="Gender (auto if MyKad)")
    phone_mobile: str = Field(..., description="Mobile phone number")
    occupation: Occupation
    bank_name: str = Field(..., description="Bank name (active bank)")
    bank_account: str = Field(..., description="Bank account number")


# Child Information (up to 5)
class ChildInfo(BaseModel):
    id_number: str = Field(..., description="MyKad/MyKid number")
    name: str = Field(..., description="Full name")
    age: Optional[int] = Field(None, description="Age (auto if in JPN)")
    status: ChildStatus = Field(..., description="Biological or adopted")


# Guardian/Waris Information
class GuardianInfo(BaseModel):
    relationship: GuardianRelationship
    id_type: IDType
    id_number: str = Field(..., description="Identification number")
    name: str = Field(..., description="Full name")
    phone_mobile: str = Field(..., description="Mobile phone number")
    same_as_spouse: bool = Field(default=False, description="Copy from spouse info")


# Complete STR Application
class STRApplication(BaseModel):
    applicant: ApplicantInfo
    spouse: Optional[SpouseInfo] = None
    children: List[ChildInfo] = Field(default_factory=list, max_items=5)
    guardian: GuardianInfo
    
    class Config:
        json_schema_extra = {
            "example": {
                "applicant": {
                    "ic_number": "900101015678",
                    "name": "Ahmad Bin Ali",
                    "age": 34,
                    "gender": "Male",
                    "phone_mobile": "0123456789",
                    "occupation": "employed",
                    "household_monthly_income": 2200.0,
                    "marital_status": "married",
                    "marital_date": "2015-06-15",
                    "address": "No. 123, Jalan Mawar, Taman Indah",
                    "postcode": "50000",
                    "city": "Kuala Lumpur",
                    "state": "Wilayah Persekutuan",
                    "bank_name": "Maybank",
                    "bank_account": "1234567890",
                    "email": "ahmad@email.com"
                }
            }
        }


# Document Checklist
class DocumentItem(BaseModel):
    document_type: str
    required: bool
    description_en: str
    description_ms: str
    description_zh: str
    description_ta: str


# Application Summary Response
class STRApplicationSummary(BaseModel):
    success: bool
    application_data: STRApplication
    eligibility_result: dict
    estimated_amount: Optional[float] = None
    required_documents: List[DocumentItem]
    next_steps: dict  # Translated instructions
    portal_url: str = "https://bantuantunai.gov.my/"
    message: str


# Progress Tracking
class ApplicationProgress(BaseModel):
    step: int  # 1-6 (Applicant, Spouse, Children, Documents, Guardian, Confirmation)
    total_steps: int = 6
    completed_sections: List[str]
    current_section: str
    data_collected: dict
