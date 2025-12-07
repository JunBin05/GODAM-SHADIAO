from fastapi import APIRouter, HTTPException, status, Query
from backend.models.reminder import Reminder, ReminderListResponse
from backend.services.reminder_service import get_user_reminders, get_unread_count, mark_reminder_as_read

router = APIRouter()


@router.get("/{user_id}", response_model=ReminderListResponse)
async def get_reminders(
    user_id: str,
    lang: str = Query("en", description="Language code (en/ms/zh/ta)"),
    include_past: bool = Query(False, description="Include all past reminders")
):
    """
    Get reminders for a user with multi-language support.
    
    - **user_id**: User identifier
    - **lang**: Language code (en=English, ms=Malay, zh=Chinese, ta=Tamil)
    - **include_past**: Include all past reminders (default: only future + last 7 days)
    
    Returns list of reminders sorted by date (newest first) with translations.
    Reminder types: payment_deadline, credit_expiry, application_update, program_announcement
    """
    # Validate language
    if lang not in ["en", "ms", "zh", "ta"]:
        lang = "en"
    
    # Get user reminders with translations
    reminders = get_user_reminders(user_id, lang, include_past)
    
    # Get unread count
    unread_count = get_unread_count(user_id)
    
    # Build message based on language
    messages = {
        "en": f"Successfully retrieved {len(reminders)} reminder(s)",
        "ms": f"Berjaya mendapatkan {len(reminders)} peringatan",
        "zh": f"成功获取 {len(reminders)} 个提醒",
        "ta": f"{len(reminders)} நினைவூட்டல்களை வெற்றிகரமாக பெறப்பட்டது"
    }
    message = messages.get(lang, messages["en"])
    
    return ReminderListResponse(
        success=True,
        data=[Reminder(**r) for r in reminders],
        unread_count=unread_count,
        message=message
    )


@router.post("/{user_id}/{reminder_id}/mark-read")
async def mark_read(
    user_id: str,
    reminder_id: str,
    lang: str = Query("en", description="Language code (en or ms)")
):
    """
    Mark a reminder as read.
    
    - **user_id**: User identifier
    - **reminder_id**: Reminder identifier
    - **lang**: Language code (en or ms)
    """
    success = mark_reminder_as_read(user_id, reminder_id)
    
    if not success:
        error_messages = {
            "en": "Reminder not found",
            "ms": "Peringatan tidak dijumpai",
            "zh": "找不到提醒",
            "ta": "நினைவூட்டல் கண்டுபிடிக்கப்படவில்லை"
        }
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": error_messages.get(lang, error_messages["en"]),
                "code": "REMINDER_NOT_FOUND"
            }
        )
    
    success_messages = {
        "en": "Reminder marked as read",
        "ms": "Peringatan ditandakan sebagai dibaca",
        "zh": "提醒已标记为已读",
        "ta": "நினைவூட்டல் படித்ததாக குறிக்கப்பட்டது"
    }
    success_msg = success_messages.get(lang, success_messages["en"])
    
    return {
        "success": True,
        "message": success_msg
    }


@router.get("/{user_id}/unread-count")
async def get_unread_reminders_count(user_id: str):
    """
    Get count of unread reminders for a user.
    
    - **user_id**: User identifier
    
    Returns the number of unread reminders.
    """
    count = get_unread_count(user_id)
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "unread_count": count
        },
        "message": "Unread count retrieved successfully"
    }
