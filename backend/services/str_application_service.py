"""
STR Application Service
Handles STR 2026 application data collection, validation, and document checklist generation
"""

from typing import Dict, List
from models.str_application import (
    STRApplication, ApplicantInfo, SpouseInfo, ChildInfo, GuardianInfo,
    DocumentItem, STRApplicationSummary, MaritalStatus
)
from services.eligibility_service import check_eligibility


def generate_document_checklist(marital_status: MaritalStatus, has_children: bool) -> List[DocumentItem]:
    """
    Generate required document checklist based on marital status and children
    
    Args:
        marital_status: User's marital status
        has_children: Whether user has children
    
    Returns:
        List of required documents with multi-language descriptions
    """
    documents = []
    
    # Marriage-related documents
    if marital_status == MaritalStatus.MARRIED:
        documents.append(DocumentItem(
            document_type="marriage_cert",
            required=True,
            description_en="Marriage Certificate (Sijil Kahwin)",
            description_ms="Sijil Kahwin",
            description_zh="结婚证书",
            description_ta="திருமண சான்றிதழ்"
        ))
        documents.append(DocumentItem(
            document_type="spouse_confirmation",
            required=True,
            description_en="Spouse Confirmation Letter (Pengesahan Pasangan)",
            description_ms="Pengesahan Pasangan",
            description_zh="配偶确认信",
            description_ta="மனைவி/கணவர் உறுதிப்படுத்தல்"
        ))
    
    elif marital_status == MaritalStatus.DIVORCED:
        documents.append(DocumentItem(
            document_type="divorce_cert",
            required=True,
            description_en="Divorce Certificate (Sijil Cerai)",
            description_ms="Sijil Cerai",
            description_zh="离婚证书",
            description_ta="விவாகரத்து சான்றிதழ்"
        ))
    
    elif marital_status == MaritalStatus.WIDOWED:
        documents.append(DocumentItem(
            document_type="death_cert",
            required=True,
            description_en="Spouse Death Certificate (Sijil Kematian Pasangan)",
            description_ms="Sijil Kematian Pasangan",
            description_zh="配偶死亡证明",
            description_ta="மனைவி/கணவர் இறப்பு சான்றிதழ்"
        ))
    
    # Children-related documents
    if has_children:
        documents.append(DocumentItem(
            document_type="student_status",
            required=True,
            description_en="Student Status Confirmation (for children in school)",
            description_ms="Pengesahan Status Pelajar",
            description_zh="学生身份确认",
            description_ta="மாணவர் நிலை உறுதிப்படுத்தல்"
        ))
        documents.append(DocumentItem(
            document_type="birth_certs",
            required=True,
            description_en="Birth Certificates of all children (Sijil Lahir Anak)",
            description_ms="Sijil Lahir Anak (semua)",
            description_zh="所有子女的出生证明",
            description_ta="அனைத்து குழந்தைகளின் பிறப்பு சான்றிதழ்கள்"
        ))
    
    # General requirements
    documents.append(DocumentItem(
        document_type="ic_copy",
        required=True,
        description_en="MyKad/IC copy (front and back)",
        description_ms="Salinan MyKad (depan dan belakang)",
        description_zh="身份证副本（正反面）",
        description_ta="அடையாள அட்டை நகல் (முன் மற்றும் பின்)"
    ))
    
    documents.append(DocumentItem(
        document_type="bank_statement",
        required=False,
        description_en="Bank statement (if requested)",
        description_ms="Penyata bank (jika diminta)",
        description_zh="银行对账单（如要求）",
        description_ta="வங்கி அறிக்கை (தேவைப்பட்டால்)"
    ))
    
    return documents


def validate_application_data(application: STRApplication) -> Dict[str, any]:
    """
    Validate STR application data before submission
    
    Args:
        application: Complete STR application data
    
    Returns:
        Validation result with errors (if any)
    """
    errors = []
    
    # Validate IC number format (basic check)
    if len(application.applicant.ic_number) != 12:
        errors.append({
            "field": "ic_number",
            "message_en": "IC number must be 12 digits",
            "message_ms": "Nombor IC mesti 12 digit",
            "message_zh": "身份证号码必须是12位数字",
            "message_ta": "அடையாள எண் 12 இலக்கங்களாக இருக்க வேண்டும்"
        })
    
    # Validate spouse data if married
    if application.applicant.marital_status == MaritalStatus.MARRIED:
        if not application.spouse:
            errors.append({
                "field": "spouse",
                "message_en": "Spouse information is required for married applicants",
                "message_ms": "Maklumat pasangan diperlukan untuk pemohon berkahwin",
                "message_zh": "已婚申请人需要配偶信息",
                "message_ta": "திருமணமானவர்களுக்கு மனைவி/கணவர் தகவல் தேவை"
            })
    
    # Validate children count (max 5)
    if len(application.children) > 5:
        errors.append({
            "field": "children",
            "message_en": "Maximum 5 children allowed",
            "message_ms": "Maksimum 5 orang anak dibenarkan",
            "message_zh": "最多允许5个孩子",
            "message_ta": "அதிகபட்சம் 5 குழந்தைகள் மட்டுமே அனுமதிக்கப்படும்"
        })
    
    # Validate marital date if applicable
    if application.applicant.marital_status != MaritalStatus.SINGLE:
        if not application.applicant.marital_date:
            errors.append({
                "field": "marital_date",
                "message_en": "Marital date is required",
                "message_ms": "Tarikh perkahwinan/cerai/kematian diperlukan",
                "message_zh": "需要婚姻日期",
                "message_ta": "திருமண தேதி தேவை"
            })
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


def prepare_str_application(application: STRApplication, lang: str = "en") -> STRApplicationSummary:
    """
    Prepare STR application summary with eligibility check and document checklist
    
    Args:
        application: Complete STR application data
        lang: Language for response (en/ms/zh/ta)
    
    Returns:
        Application summary with eligibility, documents, and next steps
    """
    # Step 1: Validate data
    validation = validate_application_data(application)
    if not validation["valid"]:
        return STRApplicationSummary(
            success=False,
            application_data=application,
            eligibility_result={"eligible": False, "errors": validation["errors"]},
            required_documents=[],
            next_steps={},
            message="Validation failed. Please check errors."
        )
    
    # Step 2: Calculate STR eligibility based on income and children
    income = application.applicant.household_monthly_income
    num_children = len(application.children)
    
    # STR 2026 tiered amounts
    if income <= 2500:
        if num_children == 0:
            amount = 150
        elif num_children <= 2:
            amount = 300
        elif num_children <= 4:
            amount = 500
        else:
            amount = 650
    elif income <= 5000:
        if num_children == 0:
            amount = 100
        elif num_children <= 2:
            amount = 200
        elif num_children <= 4:
            amount = 250
        else:
            amount = 300
    else:
        amount = 0
    
    eligibility_result = {
        "eligible": amount > 0,
        "estimated_amount": amount,
        "reason": f"Household income RM{income:.2f}, {num_children} children" if amount > 0 else "Income exceeds RM5,000 threshold"
    }
    
    # Step 3: Generate document checklist
    documents = generate_document_checklist(
        application.applicant.marital_status,
        len(application.children) > 0
    )
    
    # Step 4: Generate next steps following official STR 2026 guide (6 sections)
    next_steps = {
        "en": [
            "STEP 1 - APPLICANT INFO (Maklumat Pemohon):",
            "• Visit https://bantuantunai.gov.my/ → Click 'Permohonan Baharu'",
            "• Enter MyKad → System auto-fills Name, Age, Gender from JPN",
            f"• Fill: Home Phone ({application.applicant.phone_home or 'REQUIRED'}), Mobile ({application.applicant.phone_mobile})",
            f"• Select: Occupation ({application.applicant.occupation}), Monthly Income (RM{application.applicant.household_monthly_income:.2f})",
            f"• Marital Status: {application.applicant.marital_status.value.upper()}" + (f" - Date: {application.applicant.marital_date}" if application.applicant.marital_date else ""),
            f"• Address: {application.applicant.address}, {application.applicant.postcode} {application.applicant.city}, {application.applicant.state}",
            f"• Bank: {application.applicant.bank_name} - {application.applicant.bank_account}",
            f"• Email: {application.applicant.email}",
            "",
            "STEP 2 - SPOUSE INFO (Maklumat Pasangan):" if application.spouse else "STEP 2 - SPOUSE INFO: SKIP (Single/Divorced/Widowed)",
            f"• ID Type: {application.spouse.id_type.value.upper() if application.spouse else 'N/A'} - Number: {application.spouse.id_number if application.spouse else 'N/A'}",
            f"• Name: {application.spouse.name if application.spouse else 'N/A'} (auto-fill if in JPN)",
            f"• Mobile: {application.spouse.phone_mobile if application.spouse else 'N/A'}, Occupation: {application.spouse.occupation.value if application.spouse else 'N/A'}",
            f"• Bank: {application.spouse.bank_name if application.spouse else 'N/A'} - {application.spouse.bank_account if application.spouse else 'N/A'}" if application.spouse else "",
            "",
            f"STEP 3 - CHILDREN INFO (Maklumat Anak): {len(application.children)} children",
        ] + ([f"• Child {i+1}: {child.name} ({child.status.value}, Age {child.age}, ID: {child.id_number})" for i, child in enumerate(application.children)] if application.children else ["• No children"]) + [
            "• Max 5 children allowed",
            "",
            "STEP 4 - SUPPORTING DOCUMENTS (Dokumen Sokongan):",
            "• Upload required documents (PDF/JPG/PNG, max 3MB each):",
        ] + [f"  - {doc.description_en}" for doc in documents if doc.required] + [
            "",
            "STEP 5 - GUARDIAN INFO (Maklumat Waris):",
            f"• Relationship: {application.guardian.relationship.value.upper()}",
            f"• ID: {application.guardian.id_type.value.upper()} - {application.guardian.id_number}",
            f"• Name: {application.guardian.name}, Mobile: {application.guardian.phone_mobile}",
            "",
            "STEP 6 - CONFIRMATION (Pengesahan):",
            "• Complete captcha verification",
            "• Click 'Hantar' (Submit)",
            "• Print/save confirmation receipt",
            "",
            f"✅ ESTIMATED STR AMOUNT: RM{eligibility_result.get('estimated_amount', 0):.2f}/month"
        ],
        "ms": [
            "LANGKAH 1 - MAKLUMAT PEMOHON:",
            "• Layari https://bantuantunai.gov.my/ → Klik 'Permohonan Baharu'",
            "• Masukkan No. MyKad → Sistem auto-isi Nama, Umur, Jantina dari JPN",
            f"• Isi: Telefon Rumah ({application.applicant.phone_home or 'WAJIB'}), Bimbit ({application.applicant.phone_mobile})",
            f"• Pilih: Pekerjaan ({application.applicant.occupation}), Pendapatan Bulanan (RM{application.applicant.household_monthly_income:.2f})",
            f"• Status Kahwin: {application.applicant.marital_status.value.upper()}" + (f" - Tarikh: {application.applicant.marital_date}" if application.applicant.marital_date else ""),
            f"• Alamat: {application.applicant.address}, {application.applicant.postcode} {application.applicant.city}, {application.applicant.state}",
            f"• Bank: {application.applicant.bank_name} - {application.applicant.bank_account}",
            f"• E-mel: {application.applicant.email}",
            "",
            "LANGKAH 2 - MAKLUMAT PASANGAN:" if application.spouse else "LANGKAH 2 - MAKLUMAT PASANGAN: LANGKAU (Bujang/Cerai/Janda/Duda)",
            f"• Jenis ID: {application.spouse.id_type.value.upper() if application.spouse else 'T/A'} - Nombor: {application.spouse.id_number if application.spouse else 'T/A'}",
            f"• Nama: {application.spouse.name if application.spouse else 'T/A'} (auto-isi jika dalam JPN)",
            f"• Bimbit: {application.spouse.phone_mobile if application.spouse else 'T/A'}, Pekerjaan: {application.spouse.occupation.value if application.spouse else 'T/A'}",
            f"• Bank: {application.spouse.bank_name if application.spouse else 'T/A'} - {application.spouse.bank_account if application.spouse else 'T/A'}" if application.spouse else "",
            "",
            f"LANGKAH 3 - MAKLUMAT ANAK: {len(application.children)} orang anak",
        ] + ([f"• Anak {i+1}: {child.name} ({child.status.value}, Umur {child.age}, ID: {child.id_number})" for i, child in enumerate(application.children)] if application.children else ["• Tiada anak"]) + [
            "• Maksimum 5 orang anak",
            "",
            "LANGKAH 4 - DOKUMEN SOKONGAN:",
            "• Muat naik dokumen (PDF/JPG/PNG, maks 3MB setiap satu):",
        ] + [f"  - {doc.description_ms}" for doc in documents if doc.required] + [
            "",
            "LANGKAH 5 - MAKLUMAT WARIS:",
            f"• Hubungan: {application.guardian.relationship.value.upper()}",
            f"• ID: {application.guardian.id_type.value.upper()} - {application.guardian.id_number}",
            f"• Nama: {application.guardian.name}, Bimbit: {application.guardian.phone_mobile}",
            "",
            "LANGKAH 6 - PENGESAHAN:",
            "• Lengkapkan captcha",
            "• Klik 'Hantar'",
            "• Cetak/simpan resit pengesahan",
            "",
            f"✅ ANGGARAN JUMLAH STR: RM{eligibility_result.get('estimated_amount', 0):.2f}/bulan"
        ],
        "zh": [
            "步骤 1 - 申请人信息:",
            "• 访问 https://bantuantunai.gov.my/ → 点击 'Permohonan Baharu'",
            "• 输入身份证号 → 系统从JPN自动填写姓名、年龄、性别",
            f"• 填写: 家庭电话 ({application.applicant.phone_home or '必填'}), 手机 ({application.applicant.phone_mobile})",
            f"• 选择: 职业 ({application.applicant.occupation}), 月收入 (RM{application.applicant.household_monthly_income:.2f})",
            f"• 婚姻状况: {application.applicant.marital_status.value.upper()}" + (f" - 日期: {application.applicant.marital_date}" if application.applicant.marital_date else ""),
            f"• 地址: {application.applicant.address}, {application.applicant.postcode} {application.applicant.city}, {application.applicant.state}",
            f"• 银行: {application.applicant.bank_name} - {application.applicant.bank_account}",
            f"• 电子邮件: {application.applicant.email}",
            "",
            "步骤 2 - 配偶信息:" if application.spouse else "步骤 2 - 配偶信息: 跳过 (单身/离婚/丧偶)",
            f"• 证件类型: {application.spouse.id_type.value.upper() if application.spouse else '不适用'} - 号码: {application.spouse.id_number if application.spouse else '不适用'}",
            f"• 姓名: {application.spouse.name if application.spouse else '不适用'}",
            f"• 手机: {application.spouse.phone_mobile if application.spouse else '不适用'}, 职业: {application.spouse.occupation.value if application.spouse else '不适用'}",
            f"• 银行: {application.spouse.bank_name if application.spouse else '不适用'} - {application.spouse.bank_account if application.spouse else '不适用'}" if application.spouse else "",
            "",
            f"步骤 3 - 子女信息: {len(application.children)} 个孩子",
        ] + ([f"• 孩子 {i+1}: {child.name} ({child.status.value}, {child.age}岁, ID: {child.id_number})" for i, child in enumerate(application.children)] if application.children else ["• 无子女"]) + [
            "• 最多5个孩子",
            "",
            "步骤 4 - 支持文件:",
            "• 上传文件 (PDF/JPG/PNG, 每个最大3MB):",
        ] + [f"  - {doc.description_zh}" for doc in documents if doc.required] + [
            "",
            "步骤 5 - 监护人信息:",
            f"• 关系: {application.guardian.relationship.value.upper()}",
            f"• 证件: {application.guardian.id_type.value.upper()} - {application.guardian.id_number}",
            f"• 姓名: {application.guardian.name}, 手机: {application.guardian.phone_mobile}",
            "",
            "步骤 6 - 确认:",
            "• 完成验证码验证",
            "• 点击 'Hantar' (提交)",
            "• 打印/保存确认收据",
            "",
            f"✅ 预计STR金额: 每月RM{eligibility_result.get('estimated_amount', 0):.2f}"
        ],
        "ta": [
            "படி 1 - விண்ணப்பதாரர் தகவல்:",
            "• https://bantuantunai.gov.my/ ஐப் பார்வையிடவும் → 'Permohonan Baharu' கிளிக் செய்யவும்",
            "• MyKad எண்ணை உள்ளிடவும் → JPN இலிருந்து பெயர், வயது, பாலினம் தானாக நிரப்பப்படும்",
            f"• நிரப்பவும்: வீட்டு தொலைபேசி ({application.applicant.phone_home or 'தேவை'}), மொபைல் ({application.applicant.phone_mobile})",
            f"• தேர்வு செய்யவும்: தொழில் ({application.applicant.occupation}), மாத வருமானம் (RM{application.applicant.household_monthly_income:.2f})",
            f"• திருமண நிலை: {application.applicant.marital_status.value.upper()}" + (f" - தேதி: {application.applicant.marital_date}" if application.applicant.marital_date else ""),
            f"• முகவரி: {application.applicant.address}, {application.applicant.postcode} {application.applicant.city}, {application.applicant.state}",
            f"• வங்கி: {application.applicant.bank_name} - {application.applicant.bank_account}",
            f"• மின்னஞ்சல்: {application.applicant.email}",
            "",
            "படி 2 - மனைவி/கணவர் தகவல்:" if application.spouse else "படி 2 - மனைவி/கணவர் தகவல்: தவிர்க்கவும் (தனிநபர்/விவாகரத்து/விதவை)",
            f"• அடையாள வகை: {application.spouse.id_type.value.upper() if application.spouse else 'பொ.இ'} - எண்: {application.spouse.id_number if application.spouse else 'பொ.இ'}",
            f"• பெயர்: {application.spouse.name if application.spouse else 'பொ.இ'}",
            f"• மொபைல்: {application.spouse.phone_mobile if application.spouse else 'பொ.இ'}, தொழில்: {application.spouse.occupation.value if application.spouse else 'பொ.இ'}",
            f"• வங்கி: {application.spouse.bank_name if application.spouse else 'பொ.இ'} - {application.spouse.bank_account if application.spouse else 'பொ.இ'}" if application.spouse else "",
            "",
            f"படி 3 - குழந்தைகள் தகவல்: {len(application.children)} குழந்தைகள்",
        ] + ([f"• குழந்தை {i+1}: {child.name} ({child.status.value}, {child.age} வயது, ID: {child.id_number})" for i, child in enumerate(application.children)] if application.children else ["• குழந்தைகள் இல்லை"]) + [
            "• அதிகபட்சம் 5 குழந்தைகள்",
            "",
            "படி 4 - ஆதரவு ஆவணங்கள்:",
            "• ஆவணங்களைப் பதிவேற்றவும் (PDF/JPG/PNG, ஒவ்வொன்றும் அதிகபட்சம் 3MB):",
        ] + [f"  - {doc.description_ta}" for doc in documents if doc.required] + [
            "",
            "படி 5 - பாதுகாவலர் தகவல்:",
            f"• உறவு: {application.guardian.relationship.value.upper()}",
            f"• அடையாளம்: {application.guardian.id_type.value.upper()} - {application.guardian.id_number}",
            f"• பெயர்: {application.guardian.name}, மொபைல்: {application.guardian.phone_mobile}",
            "",
            "படி 6 - உறுதிப்படுத்தல்:",
            "• கேப்ட்சா சரிபார்ப்பை முடிக்கவும்",
            "• 'Hantar' (சமர்ப்பி) கிளிக் செய்யவும்",
            "• உறுதிப்படுத்தல் ரசீதை அச்சிடவும்/சேமிக்கவும்",
            "",
            f"✅ மதிப்பிடப்பட்ட STR தொகை: மாதம் RM{eligibility_result.get('estimated_amount', 0):.2f}"
        ]
    }
    
    # Step 5: Build response
    success_messages = {
        "en": f"Application ready! You qualify for RM{eligibility_result.get('estimated_amount', 0):.2f}/month. Please review and proceed to portal.",
        "ms": f"Permohonan sedia! Anda layak untuk RM{eligibility_result.get('estimated_amount', 0):.2f}/bulan. Sila semak dan teruskan ke portal.",
        "zh": f"申请准备就绪！您有资格获得每月RM{eligibility_result.get('estimated_amount', 0):.2f}。请查看并前往门户网站。",
        "ta": f"விண்ணப்பம் தயார்! நீங்கள் மாதம் RM{eligibility_result.get('estimated_amount', 0):.2f} பெற தகுதியுடையவர். தயவுசெய்து மதிப்பாய்வு செய்து போர்ட்டலுக்குச் செல்லவும்."
    }
    
    return STRApplicationSummary(
        success=True,
        application_data=application,
        eligibility_result=eligibility_result,
        estimated_amount=eligibility_result.get("estimated_amount"),
        required_documents=documents,
        next_steps=next_steps,  # Pass full dict with all languages
        message=success_messages.get(lang, success_messages["en"])
    )
