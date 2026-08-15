import os
import re
import fitz  # PyMuPDF
import cv2
import numpy as np
import pdfplumber
import paddle
from paddleocr import PaddleOCR
from typing import Dict, Any, List

class DocumentExtractionService:
    _ocr_engine = None

    @classmethod
    def get_ocr_engine(cls) -> PaddleOCR:
        """
        Khởi tạo PaddleOCR Singleton.
        Tự động kích hoạt GPU nếu hệ thống có CUDA, ngược lại chạy trên CPU.
        """
        if cls._ocr_engine is None:
            # Kiểm tra xem CUDA GPU có sẵn sàng không
            has_gpu = paddle.device.is_compiled_with_cuda() and paddle.device.cuda.device_count() > 0
            device_type = "GPU" if has_gpu else "CPU"
            print(f"[PaddleOCR] Đang khởi tạo mô hình nhận diện tiếng Việt trên thiết bị: {device_type}")

            cls._ocr_engine = PaddleOCR(
                use_angle_cls=True,
                lang="vi",
                use_gpu=has_gpu,
                show_log=False
            )
        return cls._ocr_engine

    # =========================================================================
    # 1. TRÍCH XUẤT CCCD BẰNG PADDLEOCR (XỬ LÝ SCAN / ẢNH)
    # =========================================================================
    @classmethod
    def extract_from_cccd(cls, pdf_path: str) -> Dict[str, Any]:
        ocr = cls.get_ocr_engine()
        doc = fitz.open(pdf_path)
        
        all_ocr_lines: List[str] = []

        # Chuyển đổi từng trang PDF thành hình ảnh độ nét cao (DPI 300)
        for page_index in range(len(doc)):
            page = doc[page_index]
            pix = page.get_pixmap(dpi=300)
            img_bytes = np.frombuffer(pix.samples, dtype=np.uint8)
            img = img_bytes.reshape((pix.height, pix.width, pix.n))
            
            if pix.n == 4:  # RGBA -> BGR
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
            elif pix.n == 3:  # RGB -> BGR
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

            # Thực thi PaddleOCR trên trang
            result = ocr.ocr(img, cls=True)
            if result and result[0]:
                for line in result[0]:
                    text = line[1][0].strip()
                    if text:
                        all_ocr_lines.append(text)

        full_text = "\n".join(all_ocr_lines)
        
        extracted_data = {
            "cccd_id": None,
            "full_name": None,
            "dob": None,
            "gender": None,
            "nationality": "Việt Nam",
            "place_of_origin": None,
            "place_of_residence": None,
            "date_of_issue": None,
            "mrz_code": None
        }

        # 1. Trích xuất số CCCD (12 chữ số)
        id_match = re.search(r'\b(0\d{11})\b', full_text)
        if id_match:
            extracted_data["cccd_id"] = id_match.group(1)

        # 2. Quét dòng mã vạch chuẩn ICAO / MRZ ở mặt sau CCCD (IDVNM...)
        mrz_match = re.search(r'(IDVNM\d{12}[\s\S]*?)(?=\n\n|$)', full_text)
        if mrz_match:
            extracted_data["mrz_code"] = mrz_match.group(1).replace("\n", " ").strip()
            # Nếu chưa có ID thì lấy từ MRZ
            if not extracted_data["cccd_id"]:
                mrz_id = re.search(r'IDVNM(\d{12})', extracted_data["mrz_code"].replace(" ", ""))
                if mrz_id:
                    extracted_data["cccd_id"] = mrz_id.group(1)

        # 3. Phân tích ngữ cảnh từng dòng để bóc tách thông tin chi tiết
        for i, line in enumerate(all_ocr_lines):
            upper_line = line.upper()
            
            # Tìm Họ và tên
            if ("HỌ VÀ TÊN" in upper_line or "FULL NAME" in upper_line) and i + 1 < len(all_ocr_lines):
                potential_name = all_ocr_lines[i + 1].strip()
                if potential_name.isupper() and not any(char.isdigit() for char in potential_name):
                    extracted_data["full_name"] = potential_name

            # Tìm Ngày sinh
            dob_match = re.search(r'(\d{2}/\d{2}/\d{4})', line)
            if dob_match and not extracted_data["dob"]:
                extracted_data["dob"] = dob_match.group(1)

            # Tìm Giới tính
            if "NAM" in upper_line and "NỮ" not in upper_line:
                extracted_data["gender"] = "Nam"
            elif "NỮ" in upper_line:
                extracted_data["gender"] = "Nữ"

            # Tìm Nơi thường trú
            if "NƠI THƯỜNG TRÚ" in upper_line or "PLACE OF RESIDENCE" in upper_line:
                residence_parts = []
                for offset in range(1, 3):
                    if i + offset < len(all_ocr_lines):
                        residence_parts.append(all_ocr_lines[i + offset])
                extracted_data["place_of_residence"] = ", ".join(residence_parts).replace(":,", "").strip()

        return extracted_data

    # =========================================================================
    # 2. TRÍCH XUẤT GIẤY ĐỀ NGHỊ VAY VỐN BẰNG PDFPLUMBER
    # =========================================================================
    @staticmethod
    def extract_from_loan_app(pdf_path: str) -> Dict[str, Any]:
        loan_data = {
            "borrower_name": None,
            "national_id": None,
            "purpose": "Vay bổ sung vốn kinh doanh",
            "loan_amount_proposed": 0,
            "loan_term_months": None,
            "phone_number": None,
            "email": None,
            "business_name": None
        }

        with pdfplumber.open(pdf_path) as pdf:
            full_text = "\n".join([page.extract_text() or "" for page in pdf.pages])

            # Bóc số CCCD/CMND kê khai trên đơn
            id_match = re.search(r'(?:Số CMND|Thẻ CCCD|CCCD)[\s\*:\.]*([0-9]{9,12})', full_text, re.IGNORECASE)
            if id_match:
                loan_data["national_id"] = id_match.group(1)

            # Bóc thời hạn vay
            term_match = re.search(r'Thời hạn vay\s*[:：\.]*\s*(\d+)\s*tháng', full_text, re.IGNORECASE)
            if term_match:
                loan_data["loan_term_months"] = int(term_match.group(1))

            # Bóc số điện thoại
            phone_match = re.search(r'Di động[\s\*:\.]*([0-9]{9,11})', full_text)
            if phone_match:
                loan_data["phone_number"] = phone_match.group(1)

            # Bóc Email
            email_match = re.search(r'Email[\s\*:\.]*([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', full_text)
            if email_match:
                loan_data["email"] = email_match.group(1)

        return loan_data

    # =========================================================================
    # 3. TRÍCH XUẤT BẢNG KÊ KHAI NGƯỜI LIÊN QUAN BẰNG PDFPLUMBER TABLES
    # =========================================================================
    @staticmethod
    def extract_from_related_declaration(pdf_path: str) -> List[Dict[str, Any]]:
        related_entities = []

        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        # Bỏ qua header hoặc các hàng rỗng
                        if not row or len(row) < 3:
                            continue
                        
                        col1 = str(row[1] or "").replace("\n", " ").strip()
                        col2 = str(row[2] or "").replace("\n", " ").strip()
                        col3 = str(row[3] or "").replace("\n", " ").strip() if len(row) > 3 else "NGUOI_LIEN_QUAN"

                        if col1 and "Người khai" not in col1 and "Họ và tên" not in col1 and not col1.startswith("("):
                            related_entities.append({
                                "full_name": col1,
                                "identifier": col2,
                                "relationship_type": col3,
                                "ownership_ratio": str(row[6] or "").strip() if len(row) > 6 else "0%"
                            })

        return related_entities