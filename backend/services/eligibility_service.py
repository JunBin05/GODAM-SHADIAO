"""
Eligibility service - handles eligibility calculation logic
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import ELIGIBILITY_RULES


def check_eligibility(program_id: str, user_profile: dict) -> dict:
    """
    Check if user is eligible for a specific aid program
    
    Args:
        program_id: Program ID (str, sara, mykasih)
        user_profile: Dictionary containing user profile data
    
    Returns:
        Dictionary with eligibility decision and details
    """
    # Get eligibility rules for program
    rules = ELIGIBILITY_RULES.get(program_id)
    if not rules:
        return {
            "eligible": False,
            "reason": f"Unknown program: {program_id}",
            "estimated_amount": None,
            "required_documents": None
        }
    
    # Extract user data
    age = user_profile.get('age', 0)
    monthly_income = user_profile.get('monthly_income', 0)
    disability_status = user_profile.get('disability_status', False)
    
    # Check age requirement
    if age < rules['min_age']:
        return {
            "eligible": False,
            "reason": f"You do not meet the minimum age requirement of {rules['min_age']} years",
            "estimated_amount": None,
            "required_documents": None
        }
    
    # Check income requirement
    if monthly_income > rules['max_income']:
        return {
            "eligible": False,
            "reason": f"Your monthly income (RM{monthly_income:.2f}) exceeds the eligibility threshold of RM{rules['max_income']:.2f}",
            "estimated_amount": None,
            "required_documents": None
        }
    
    # User is eligible!
    base_amount = rules['base_amount']
    disability_bonus = rules['disability_bonus'] if disability_status else 0
    estimated_amount = base_amount + disability_bonus
    
    # Build reason message
    reason = "You meet all eligibility criteria for this program"
    if disability_status:
        reason += f". You qualify for an additional disability support of RM{disability_bonus:.2f}"
    
    # Required documents
    required_documents = get_required_documents(program_id, disability_status)
    
    return {
        "eligible": True,
        "reason": reason,
        "estimated_amount": estimated_amount,
        "required_documents": required_documents
    }


def get_required_documents(program_id: str, has_disability: bool = False) -> list:
    """
    Get list of required documents for application
    
    Args:
        program_id: Program ID
        has_disability: Whether applicant has disability
    
    Returns:
        List of required document names
    """
    # Common documents for all programs
    documents = [
        "Copy of IC (front and back)",
        "Latest payslip or income statement",
        "Utility bill (as proof of residence)",
        "Bank statement (last 3 months)"
    ]
    
    # Program-specific documents
    if program_id == "str":
        documents.append("B40 household verification letter")
    elif program_id == "sara":
        documents.append("Employment verification letter")
        documents.append("Household registration form")
    elif program_id == "mykasih":
        documents.append("MyKasih registration form")
    
    # Disability-specific documents
    if has_disability:
        documents.append("JKM disability card or medical certificate")
    
    return documents


def get_program_name(program_id: str) -> str:
    """Get program display name"""
    names = {
        "str": "Sumbangan Tunai Rahmah (STR)",
        "sara": "SARA",
        "mykasih": "MyKasih"
    }
    return names.get(program_id, program_id)
