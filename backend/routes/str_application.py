"""
STR Application Routes
Endpoints for STR 2026 application data collection and preparation
"""

from fastapi import APIRouter, HTTPException, status, Query
from models.str_application import STRApplication, STRApplicationSummary, ApplicationProgress
from services.str_application_service import prepare_str_application, validate_application_data

router = APIRouter()


@router.post("/prepare-application", response_model=STRApplicationSummary)
async def prepare_str_application_endpoint(
    application: STRApplication,
    lang: str = Query("en", description="Language code (en/ms/zh/ta)")
):
    """
    Prepare STR 2026 application with eligibility check and document checklist.
    
    This endpoint collects all required information for STR application,
    validates eligibility, and generates a document checklist with next steps.
    
    **Note:** This does NOT submit to the official portal. Users must visit
    https://bantuantunai.gov.my/ to complete submission with documents.
    
    - **application**: Complete application data collected via voice
    - **lang**: Language for instructions (en, ms, zh, ta)
    
    Returns application summary with:
    - Eligibility result and estimated amount
    - Required document checklist (multi-language)
    - Step-by-step instructions to complete submission
    - Portal URL for final submission
    """
    try:
        # Validate language
        if lang not in ["en", "ms", "zh", "ta"]:
            lang = "en"
        
        # Prepare application summary
        summary = prepare_str_application(application, lang)
        
        return summary
        
    except Exception as e:
        error_messages = {
            "en": f"Error preparing application: {str(e)}",
            "ms": f"Ralat menyediakan permohonan: {str(e)}",
            "zh": f"准备申请时出错：{str(e)}",
            "ta": f"விண்ணப்பத்தை தயாரிப்பதில் பிழை: {str(e)}"
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": error_messages.get(lang, error_messages["en"]),
                "code": "APPLICATION_PREPARATION_ERROR"
            }
        )


@router.post("/validate-data")
async def validate_application_data_endpoint(
    application: STRApplication,
    lang: str = Query("en", description="Language code (en/ms/zh/ta)")
):
    """
    Validate STR application data without preparing full summary.
    
    Useful for progressive validation during voice data collection.
    
    - **application**: Application data to validate
    - **lang**: Language for error messages
    
    Returns validation result with errors (if any) in selected language.
    """
    try:
        validation = validate_application_data(application)
        
        success_messages = {
            "en": "Data validation successful",
            "ms": "Pengesahan data berjaya",
            "zh": "数据验证成功",
            "ta": "தரவு சரிபார்ப்பு வெற்றிகரமாக முடிந்தது"
        }
        
        if validation["valid"]:
            return {
                "success": True,
                "message": success_messages.get(lang, success_messages["en"]),
                "errors": []
            }
        else:
            # Return errors in selected language
            translated_errors = []
            for error in validation["errors"]:
                translated_errors.append({
                    "field": error["field"],
                    "message": error.get(f"message_{lang}", error["message_en"])
                })
            
            error_messages = {
                "en": "Validation failed. Please check the errors.",
                "ms": "Pengesahan gagal. Sila semak ralat.",
                "zh": "验证失败。请检查错误。",
                "ta": "சரிபார்ப்பு தோல்வியடைந்தது. பிழைகளைச் சரிபார்க்கவும்."
            }
            
            return {
                "success": False,
                "message": error_messages.get(lang, error_messages["en"]),
                "errors": translated_errors
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": f"Validation error: {str(e)}",
                "code": "VALIDATION_ERROR"
            }
        )


@router.get("/application-info")
async def get_str_application_info(lang: str = Query("en", description="Language code (en/ms/zh/ta)")):
    """
    Get general information about STR 2026 application process.
    
    Returns overview, requirements, and portal information in selected language.
    
    - **lang**: Language code (en, ms, zh, ta)
    """
    info = {
        "en": {
            "program_name": "Sumbangan Tunai Rahmah (STR) 2026",
            "description": "Cash assistance for B40/M40 households, senior citizens, singles, and OKU",
            "amount_range": "RM100 - RM650 per month",
            "portal_url": "https://bantuantunai.gov.my/",
            "overview": [
                "STR provides cash assistance to eligible Malaysian households",
                "Amount depends on household income and number of children",
                "Application is done online through MyTax portal",
                "Processing time: 2-3 months"
            ],
            "basic_requirements": [
                "Malaysian citizen (MyKad holder)",
                "Household monthly income ≤ RM5,000",
                "Active bank account",
                "Valid email address and mobile number"
            ]
        },
        "ms": {
            "program_name": "Sumbangan Tunai Rahmah (STR) 2026",
            "description": "Bantuan tunai untuk isi rumah B40/M40, warga emas, bujang, dan OKU",
            "amount_range": "RM100 - RM650 sebulan",
            "portal_url": "https://bantuantunai.gov.my/",
            "overview": [
                "STR menyediakan bantuan tunai untuk isi rumah Malaysia yang layak",
                "Jumlah bergantung kepada pendapatan isi rumah dan bilangan anak",
                "Permohonan dibuat secara dalam talian melalui portal MyTax",
                "Masa pemprosesan: 2-3 bulan"
            ],
            "basic_requirements": [
                "Warganegara Malaysia (pemegang MyKad)",
                "Pendapatan bulanan isi rumah ≤ RM5,000",
                "Akaun bank yang aktif",
                "Alamat e-mel dan nombor telefon bimbit yang sah"
            ]
        },
        "zh": {
            "program_name": "拉赫玛现金援助 (STR) 2026",
            "description": "为B40/M40家庭、老年人、单身人士和残疾人提供现金援助",
            "amount_range": "每月RM100 - RM650",
            "portal_url": "https://bantuantunai.gov.my/",
            "overview": [
                "STR为符合条件的马来西亚家庭提供现金援助",
                "金额取决于家庭收入和子女人数",
                "通过MyTax门户网站在线申请",
                "处理时间：2-3个月"
            ],
            "basic_requirements": [
                "马来西亚公民（身份证持有人）",
                "家庭月收入≤RM5,000",
                "有效的银行账户",
                "有效的电子邮件地址和手机号码"
            ]
        },
        "ta": {
            "program_name": "சும்பாங்கன் துனை ரஹ்மா (STR) 2026",
            "description": "B40/M40 குடும்பங்கள், மூத்த குடிமக்கள், தனிநபர்கள் மற்றும் OKU களுக்கான பண உதவி",
            "amount_range": "மாதம் RM100 - RM650",
            "portal_url": "https://bantuantunai.gov.my/",
            "overview": [
                "STR தகுதியுள்ள மலேசிய குடும்பங்களுக்கு பண உதவி வழங்குகிறது",
                "தொகை குடும்ப வருமானம் மற்றும் குழந்தைகளின் எண்ணிக்கையைப் பொறுத்தது",
                "MyTax போர்ட்டல் மூலம் ஆன்லைனில் விண்ணப்பிக்கலாம்",
                "செயலாக்க நேரம்: 2-3 மாதங்கள்"
            ],
            "basic_requirements": [
                "மலேசிய குடிமகன் (MyKad வைத்திருப்பவர்)",
                "குடும்ப மாத வருமானம் ≤ RM5,000",
                "செயலில் உள்ள வங்கிக் கணக்கு",
                "செல்லுபடியாகும் மின்னஞ்சல் முகவரி மற்றும் மொபைல் எண்"
            ]
        }
    }
    
    return {
        "success": True,
        "data": info.get(lang, info["en"])
    }
