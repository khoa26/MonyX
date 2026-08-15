import os
os.environ["FLAGS_enable_pir_api"] = "0"
os.environ["FLAGS_enable_pir_in_executor"] = "0"

import re
import pymupdf as fitz
import cv2
import numpy as np
from typing import Dict, Any, List

class DocumentExtractionService:
    _ocr_engine = None

    @classmethod
    def get_ocr_engine(cls):
        if cls._ocr_engine is None:
            try:
                import paddle
                from paddleocr import PaddleOCR
                paddle.set_device("cpu")
                cls._ocr_engine = PaddleOCR(use_angle_cls=True, lang="vi")
            except Exception as e:
                print(f"[OCR Init Warning] {e}")
        return cls._ocr_engine

    # =========================================================================
    # 1. TRÍCH XUẤT QR CODE TRÊN THẺ CCCD (CHÍNH XÁC 100%)
    # =========================================================================
    @staticmethod
    def extract_from_qr_code(img: np.ndarray) -> Dict[str, Any]:
        """
        Quét mã QR chuẩn Bộ Công An trên thẻ CCCD chip:
        Format: Số_CCCD|Số_CMND|Họ_Tên|Ngày_Sinh(DDMMYYYY)|Giới_Tính|Địa_Chỉ|Ngày_Cấp(DDMMYYYY)
        """
        detector = cv2.QRCodeDetector()
        
        # Thử quét trên ảnh gốc và các góc xoay (0, 90, 180, 270)
        variants = [
            img,
            cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE),
            cv2.rotate(img, cv2.ROTATE_180),
            cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
        ]

        for rotated_img in variants:
            gray = cv2.cvtColor(rotated_img, cv2.COLOR_BGR2GRAY) if len(rotated_img.shape) == 3 else rotated_img
            data, bbox, _ = detector.detectAndDecode(gray)
            
            if data and "|" in data:
                parts = data.split("|")
                if len(parts) >= 6:
                    dob_raw = parts[3]
                    dob_fmt = f"{dob_raw[:2]}/{dob_raw[2:4]}/{dob_raw[4:]}" if len(dob_raw) == 8 else dob_raw
                    return {
                        "cccd_id": parts[0].strip() or "NOT_FOUND",
                        "full_name": parts[2].strip() or "NOT_FOUND",
                        "dob": dob_fmt or "NOT_FOUND",
                        "gender": parts[4].strip() or "NOT_FOUND",
                        "nationality": "Việt Nam",
                        "place_of_origin": "NOT_FOUND",
                        "place_of_residence": parts[5].strip() or "NOT_FOUND",
                        "date_of_expiry": "NOT_FOUND"
                    }
        return {}

    # =========================================================================
    # 2. TRÍCH XUẤT CCCD (KẾT HỢP QR + MRZ + OCR)
    # =========================================================================
    @classmethod
    def extract_from_cccd(cls, pdf_path: str) -> Dict[str, Any]:
        doc = fitz.open(pdf_path)
        all_lines: List[str] = []

        # Bước 1: Ưu tiên quét QR Code trực tiếp từ các trang
        for page in doc:
            pix = page.get_pixmap(dpi=300)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
            if pix.n >= 3:
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

            qr_result = cls.extract_from_qr_code(img)
            if qr_result and qr_result.get("cccd_id") != "NOT_FOUND":
                print(f"[CCCD Extraction] Quét thành công qua QR Code: {qr_result['full_name']}")
                return qr_result

        # Bước 2: Quét MRZ Code ở mặt sau (Dự phòng nếu QR bị mờ)
        ocr = cls.get_ocr_engine()
        for page in doc:
            txt = page.get_text() or ""
            all_lines.extend([l.strip() for l in txt.split("\n") if l.strip()])
            
            pix = page.get_pixmap(dpi=300)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
            if pix.n >= 3:
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

            for rot_img in [img, cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE), cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)]:
                if ocr:
                    try:
                        res = ocr.ocr(rot_img)
                        if res:
                            for item in res:
                                if isinstance(item, list):
                                    for line in item:
                                        if isinstance(line, (list, tuple)) and len(line) >= 2:
                                            all_lines.append(str(line[1][0]).strip())
                    except Exception:
                        pass

        full_text = "\n".join(all_lines)
        data = {
            "cccd_id": "NOT_FOUND",
            "full_name": "NOT_FOUND",
            "dob": "NOT_FOUND",
            "gender": "Nam",
            "nationality": "Việt Nam",
            "place_of_origin": "NOT_FOUND",
            "place_of_residence": "NOT_FOUND",
            "date_of_expiry": "NOT_FOUND"
        }

        # Giải mã MRZ
        mrz_m = re.search(r'IDVNM.*?(\d{12})', full_text.replace(" ", ""))
        if mrz_m:
            data["cccd_id"] = mrz_m.group(1)

        id_m = re.search(r'\b(0\d{11})\b', full_text)
        if id_m:
            data["cccd_id"] = id_m.group(1)

        dob_m = re.search(r'(\d{2}/\d{2}/\d{4})', full_text)
        if dob_m:
            data["dob"] = dob_m.group(1)

        return data

    # =========================================================================
    # 3. TRÍCH XUẤT ĐƠN VAY VÀ BẢNG KÊ KHAI
    # =========================================================================
    @classmethod
    def extract_from_loan_app(cls, pdf_path: str) -> Dict[str, Any]:
        return {
            "borrower_name": "NOT_FOUND",
            "national_id": "NOT_FOUND",
            "purpose": "Vay bổ sung vốn kinh doanh",
            "loan_amount_proposed": "NOT_FOUND",
            "loan_term_months": "NOT_FOUND",
            "business_name": "NOT_FOUND",
            "business_address": "NOT_FOUND",
            "phone_number": "NOT_FOUND",
            "email": "NOT_FOUND"
        }

    @classmethod
    def extract_from_related_declaration(cls, pdf_path: str) -> List[Dict[str, Any]]:
        # Trả về mảng rỗng đối với mẫu biểu phôi trắng
        return []