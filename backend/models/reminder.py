from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Reminder(BaseModel):
    """Individual reminder model"""
    reminder_id: str = Field(..., description="Unique reminder identifier")
    user_id: str = Field(..., description="User ID this reminder belongs to")
    type: str = Field(..., description="Reminder type (payment_deadline, credit_expiry, application_update, program_announcement)")
    title: str = Field(..., description="Reminder title")
    message: str = Field(..., description="Reminder message")
    program_id: Optional[str] = Field(None, description="Related aid program ID")
    date: str = Field(..., description="Reminder date (ISO format)")
    is_read: bool = Field(False, description="Whether reminder has been read")
    priority: str = Field("normal", description="Priority level (high, normal, low)")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "reminder_id": "REM001",
                "user_id": "USR001",
                "type": "payment_deadline",
                "title": "STR Payment Available",
                "message": "Your STR payment of RM300 is now available for collection",
                "program_id": "str",
                "date": "2025-12-15T00:00:00Z",
                "is_read": False,
                "priority": "high"
            }
        }
    }


class ReminderListResponse(BaseModel):
    """Response model for reminder list"""
    success: bool = Field(True, description="API call success status")
    data: List[Reminder] = Field(..., description="List of reminders")
    unread_count: int = Field(..., description="Number of unread reminders")
    message: str = Field(..., description="Response message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "data": [
                    {
                        "reminder_id": "REM001",
                        "user_id": "USR001",
                        "type": "payment_deadline",
                        "title": "STR Payment Available",
                        "message": "Your STR payment of RM300 is now available",
                        "program_id": "str",
                        "date": "2025-12-15T00:00:00Z",
                        "is_read": False,
                        "priority": "high"
                    }
                ],
                "unread_count": 3,
                "message": "Reminders retrieved successfully"
            }
        }
    }
