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
    ic_number: Optional[str] = Field(None, description="MyKad/IC number")
    name: Optional[str] = Field(None, description="Full name (auto from JPN)")
    age: Optional[int] = Field(None, description="Age (auto from JPN)")
    gender: Optional[str] = Field(None, description="Gender (auto from JPN)")
    phone_home: Optional[str] = Field(None, description="Home phone number")
    phone_mobile: Optional[str] = Field(None, description="Mobile phone number")
    occupation: Optional[Occupation] = Field(None)
    household_monthly_income: Optional[float] = Field(None, description="Gross household monthly income")
    marital_status: Optional[MaritalStatus] = Field(None)
    marital_date: Optional[date] = Field(None, description="Date of marriage/divorce/spouse death")
    address: Optional[str] = Field(None, description="Mailing address")
    postcode: Optional[str] = Field(None, description="Postcode")
    city: Optional[str] = Field(None, description="City (auto from postcode)")
    state: Optional[str] = Field(None, description="State (auto from postcode)")
    bank_name: Optional[str] = Field(None, description="Bank name (active bank)")
    bank_account: Optional[str] = Field(None, description="Bank account number")
    email: Optional[EmailStr] = Field(None, description="Email address")


# Spouse Information (if married)
class SpouseInfo(BaseModel):
    id_type: Optional[IDType] = Field(None)
    id_number: Optional[str] = Field(None, description="Identification number")
    name: Optional[str] = Field(None, description="Full name")
    gender: Optional[str] = Field(None, description="Gender (auto if MyKad)")
    phone_mobile: Optional[str] = Field(None, description="Mobile phone number")
    occupation: Optional[Occupation] = Field(None)
    bank_name: Optional[str] = Field(None, description="Bank name (active bank)")
    bank_account: Optional[str] = Field(None, description="Bank account number")


# Child Information (up to 5)
class ChildInfo(BaseModel):
    id_number: Optional[str] = Field(None, description="MyKad/MyKid number")
    name: Optional[str] = Field(None, description="Full name")
    age: Optional[int] = Field(None, description="Age (auto if in JPN)")
    status: Optional[ChildStatus] = Field(None, description="Biological or adopted")


# Guardian/Waris Information
class GuardianInfo(BaseModel):
    relationship: Optional[GuardianRelationship] = Field(None)
    id_type: Optional[IDType] = Field(None)
    id_number: Optional[str] = Field(None, description="Identification number")
    name: Optional[str] = Field(None, description="Full name")
    phone_mobile: Optional[str] = Field(None, description="Mobile phone number")
    same_as_spouse: bool = Field(default=False, description="Copy from spouse info")


# Complete STR Application
class STRApplication(BaseModel):
    applicant: ApplicantInfo
    spouse: Optional[SpouseInfo] = None
    children: List[ChildInfo] = Field(default_factory=list, max_items=5)
    guardian: Optional[GuardianInfo] = None
    
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
