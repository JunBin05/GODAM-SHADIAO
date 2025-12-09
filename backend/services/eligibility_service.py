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
    household_size = user_profile.get('household_size', 1)
    disability_status = user_profile.get('disability_status', False)
    
    # Handle STR program with complex income tiers
    if program_id == "str":
        # Check senior citizen category (60+, living alone)
        senior_rules = rules.get('senior_citizen', {})
        if age >= senior_rules.get('min_age', 60) and monthly_income <= senior_rules.get('max_income', 5000):
            return {
                "eligible": True,
                "reason": f"Eligible as senior citizen (60+) with monthly income RM{monthly_income:.2f}",
                "estimated_amount": senior_rules.get('amount', 150),
                "required_documents": ["MyKad copy", "Bank statement"]
            }
        
        # Check income tiers for households
        income_tiers = rules.get('income_tiers', {})
        tier1 = income_tiers.get('tier1', {})
        tier2 = income_tiers.get('tier2', {})
        
        # Determine which tier
        selected_tier = None
        if monthly_income <= tier1.get('max', 2500):
            selected_tier = tier1
        elif tier2.get('min', 2501) <= monthly_income <= tier2.get('max', 5000):
            selected_tier = tier2
        else:
            return {
                "eligible": False,
                "reason": f"Your monthly income (RM{monthly_income:.2f}) exceeds the eligibility threshold of RM5,000",
                "estimated_amount": None,
                "required_documents": None
            }
        
        # Calculate amount based on household size
        amounts = selected_tier.get('amounts', {})
        if household_size == 1 or household_size == 2:
            child_category = '0_child'
        elif household_size == 3 or household_size == 4:
            child_category = '1_2_child'
        elif household_size == 5 or household_size == 6:
            child_category = '3_4_child'
        else:
            child_category = '5_plus_child'
        
        estimated_amount = amounts.get(child_category, 150)
        
        return {
            "eligible": True,
            "reason": f"Eligible for STR with household income RM{monthly_income:.2f} and {household_size} members",
            "estimated_amount": estimated_amount,
            "required_documents": ["MyKad copy", "Marriage cert (if married)", "Birth certs (if children)"]
        }
    
    # Handle other programs with simple rules (SARA, MyKasih)
    if 'min_age' in rules and age < rules['min_age']:
        return {
            "eligible": False,
            "reason": f"You do not meet the minimum age requirement of {rules['min_age']} years",
            "estimated_amount": None,
            "required_documents": None
        }
    
    if 'max_income' in rules and monthly_income > rules['max_income']:
        return {
            "eligible": False,
            "reason": f"Your monthly income (RM{monthly_income:.2f}) exceeds the eligibility threshold of RM{rules['max_income']:.2f}",
            "estimated_amount": None,
            "required_documents": None
        }
    
    # User is eligible!
    base_amount = rules.get('base_amount', 100)
    disability_bonus = rules.get('disability_bonus', 0) if disability_status else 0
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
