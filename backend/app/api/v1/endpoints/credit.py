import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.services.extractor import DocumentExtractionService
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/process-individual")
async def process_individual_application(
    loan_application: UploadFile = File(...),
    national_id: UploadFile = File(...),
    related_declaration: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Tiếp nhận 3 tệp PDF hồ sơ cá nhân:
    1. Chạy PaddleOCR (GPU/CPU) bóc tách CCCD.
    2. Chạy pdfplumber bóc Giấy đề nghị vay và Bảng kê người liên quan.
    3. Đối soát chéo độ khớp thông tin (Cross-Validation).
    """
    app_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
    upload_dir = f"/tmp/monyx_intake/{app_id}"
    os.makedirs(upload_dir, exist_ok=True)

    loan_path = os.path.join(upload_dir, "giay_de_nghi_vay_von.pdf")
    cccd_path = os.path.join(upload_dir, "cccd.pdf")
    related_path = os.path.join(upload_dir, "bang_ke_khai_lien_quan.pdf")

    try:
        # Lưu các tệp nhị phân
        with open(loan_path, "wb") as f:
            shutil.copyfileobj(loan_application.file, f)
        with open(cccd_path, "wb") as f:
            shutil.copyfileobj(national_id.file, f)
        with open(related_path, "wb") as f:
            shutil.copyfileobj(related_declaration.file, f)

        # 1. Trích xuất thông tin qua OCR và Parser
        cccd_info = DocumentExtractionService.extract_from_cccd(cccd_path)
        loan_info = DocumentExtractionService.extract_from_loan_app(loan_path)
        related_entities = DocumentExtractionService.extract_from_related_declaration(related_path)

        # 2. Đối soát chéo tính nhất quán (Validation Flags)
        validation_warnings = []
        if cccd_info["cccd_id"] and loan_info["national_id"]:
            if cccd_info["cccd_id"] != loan_info["national_id"]:
                validation_warnings.append(
                    f"Cảnh báo: Số CCCD trên ảnh ({cccd_info['cccd_id']}) khác với số kê khai trên đơn ({loan_info['national_id']})."
                )

        return {
            "application_id": app_id,
            "status": "EXTRACTED_SUCCESSFULLY",
            "officer_in_charge": current_user["username"],
            "borrower_profile": {
                "full_name": cccd_info["full_name"],
                "cccd_id": cccd_info["cccd_id"],
                "date_of_birth": cccd_info["dob"],
                "gender": cccd_info["gender"],
                "residence_address": cccd_info["place_of_residence"],
                "phone": loan_info["phone_number"],
                "email": loan_info["email"],
            },
            "loan_details": {
                "purpose": loan_info["purpose"],
                "term_months": loan_info["loan_term_months"],
                "amount": loan_info["loan_amount_proposed"]
            },
            "related_group": {
                "total_members": len(related_entities),
                "entities": related_entities
            },
            "validation_warnings": validation_warnings
        }

    finally:
        # Dọn dẹp tệp tạm sau khi hoàn tất bóc tách
        shutil.rmtree(upload_dir, ignore_errors=True)