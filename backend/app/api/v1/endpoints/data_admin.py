import os
import re
import io
import pandas as pd
from typing import Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.api.deps import get_current_user
from app.db.neo4j_client import db_client
from app.core.security import get_password_hash

router = APIRouter()

# =============================================================================
# SCHEMAS / DTO
# =============================================================================
class BankConfigRequest(BaseModel):
    name: Optional[str] = "DVBank"
    full_name: Optional[str] = "Ngân hàng Thương mại Cổ phần DVBank"
    equity_capital: float                                   # Vốn tự có (VND)
    charter_capital: Optional[float] = 8_000_000_000_000.0  # Vốn điều lệ (VND)
    single_limit_ratio: Optional[float] = 0.13              # Trần đơn lẻ (13%)
    group_limit_ratio: Optional[float] = 0.21               # Trần nhóm liên quan (21%)

# =============================================================================
# CÁC HÀM TIỆN ÍCH CHUẨN HÓA DỮ LIỆU ĐỊNH DANH & THỜI GIAN
# =============================================================================
def clean_identifier(val: Any) -> str:
    """
    Chuẩn hóa tuyệt đối Mã định danh (CCCD 12 số, MST 10 hoặc 13 số):
    - 12345678901 -> '012345678901' (đệm số 0 cho CCCD 12 số)
    - 312345678 -> '0312345678' (đệm số 0 cho MST 10 số)
    - Xóa các đuôi '.0' do Excel sinh ra
    """
    if pd.isna(val):
        return ""
    s = str(val).strip()
    if s.endswith('.0'):
        s = s[:-2]
    cleaned = re.sub(r'[^\w-]', '', s).strip()
    if not cleaned or cleaned.lower() == 'nan':
        return ""
    
    # Nếu là chuỗi số 11 chữ số -> Đệm thành CCCD 12 chữ số
    if cleaned.isdigit() and len(cleaned) == 11:
        cleaned = cleaned.zfill(12)
    # Nếu là chuỗi số 9 chữ số -> Đệm thành MST 10 chữ số
    elif cleaned.isdigit() and len(cleaned) == 9:
        cleaned = cleaned.zfill(10)
        
    return cleaned

def clean_phone_number(val: Any) -> str:
    """
    Chuẩn hóa số điện thoại Việt Nam (10 số, bắt đầu bằng 0):
    - 903123456 -> '0903123456'
    """
    if pd.isna(val):
        return "NOT_FOUND"
    s = str(val).strip()
    if s.endswith('.0'):
        s = s[:-2]
    cleaned = re.sub(r'[^\d]', '', s).strip()
    if not cleaned or cleaned == "nan":
        return "NOT_FOUND"
    if len(cleaned) == 9:
        cleaned = "0" + cleaned
    return cleaned

def parse_flexible_term_months(val: Any) -> int:
    if pd.isna(val):
        return 12
    s = str(val).strip().lower()
    if not s or s == "nan":
        return 12
    if any(unit in s for unit in ["năm", "nam", "year", "y"]):
        nums = re.findall(r"\d+", s)
        if nums:
            return int(nums[0]) * 12
    nums = re.findall(r"\d+", s)
    if nums:
        return int(nums[0])
    return 12

def parse_flexible_date(val: Any) -> str:
    if pd.isna(val):
        return "2025-01-01"
    try:
        ts = pd.to_datetime(val, dayfirst=True)
        return ts.strftime("%Y-%m-%d")
    except Exception:
        s = str(val).strip().split(" ")[0]
        return s if s and s != "nan" else "2025-01-01"

def parse_flexible_interest_rate(val: Any) -> float:
    if pd.isna(val):
        return 8.5
    s = str(val).replace("%", "").strip()
    try:
        f = float(s)
        if 0 < f <= 1.0:
            return round(f * 100, 2)
        return round(f, 2)
    except Exception:
        return 8.5

def parse_ownership_ratio_flexible(val: Any) -> tuple[str, float]:
    if pd.isna(val):
        return "–", 0.0
    s = str(val).strip()
    if not s or s in ['-', '–', 'nan', '0', '0%']:
        return "–", 0.0
    cleaned = s.replace('%', '').strip()
    try:
        f = float(cleaned)
        if 0 < f <= 1.0:
            pct_float = round(f * 100, 2)
            pct_str = f"{int(pct_float)}%" if pct_float.is_integer() else f"{pct_float}%"
            return pct_str, pct_float
        else:
            pct_str = f"{int(f)}%" if f.is_integer() else f"{f}%"
            return pct_str, round(f, 2)
    except Exception:
        return "–", 0.0

# =============================================================================
# 1. NẠP HỒ SƠ TÍN DỤNG (ĐỌC DTYPE=STR)
# =============================================================================
@router.post("/import/loans")
def import_loan_contracts_excel(
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .xlsx, .xls hoặc .csv.")

    try:
        contents = file.file.read()
        # Đọc dữ liệu với dtype=str để không bị mất số 0 đầu
        df = pd.read_csv(io.BytesIO(contents), dtype=str) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(contents), dtype=str)
        df.columns = [str(col).strip().lower() for col in df.columns]
        
        id_aliases = [
            "mst/cccd", "cccd/mst", "mst_cccd", "cccd_mst", "dinh_danh", "mst", "cccd", 
            "ma_so_thue", "so_cccd", "cccd_nguoi_vay", "tax_code", "identifier"
        ]
        term_aliases = ["thoi_han", "thoi_han_thang", "thoi_han_vay", "ky_han", "term_months", "so_thang_vay"]
        date_aliases = ["ngay_giai_ngan", "ngay_bat_dau", "ngay_khoi_tao", "start_date", "disbursement_date"]
        rate_aliases = ["lai_suat_hien_tai", "lai_suat_nam", "lai_suat", "interest_rate"]
        
        records = []
        for _, row in df.iterrows():
            loan_id = str(
                row.get("ma_tin_dung") or 
                row.get("loan_id") or 
                row.get("so_hop_dong") or ""
            ).strip().upper()
            
            if not loan_id or loan_id == "NAN":
                continue

            raw_cust_type = str(
                row.get("loai_khach_hang") or 
                row.get("customer_type") or 
                row.get("loai_hinh") or ""
            ).strip().upper()
            
            is_company = (
                any(k in raw_cust_type for k in ["COMP", "DOANH", "DN", "TO CHUC", "TỔ CHỨC", "CORP"]) or
                loan_id.startswith("CORP")
            )
            borrower_type = "COMPANY" if is_company else "PERSON"

            raw_id = ""
            for col_key in id_aliases:
                if col_key in row and pd.notna(row[col_key]):
                    val = str(row[col_key]).strip()
                    if val and val.lower() != "nan":
                        raw_id = val
                        break

            # Chuẩn hóa định danh
            borrower_id = clean_identifier(raw_id)
            if not borrower_id:
                continue

            borrower_name = ""
            for col_key in ["ten_khach_hang", "ten_nguoi_vay", "ten_doanh_nghiep", "ho_ten", "borrower_name"]:
                if col_key in row and pd.notna(row[col_key]):
                    val = str(row[col_key]).strip()
                    if val and val.lower() != "nan":
                        borrower_name = val.upper()
                        break

            raw_term_val = None
            for col_key in term_aliases:
                if col_key in row and pd.notna(row[col_key]):
                    raw_term_val = row[col_key]
                    break
            term_months = parse_flexible_term_months(raw_term_val)

            raw_date_val = None
            for col_key in date_aliases:
                if col_key in row and pd.notna(row[col_key]):
                    raw_date_val = row[col_key]
                    break
            start_date = parse_flexible_date(raw_date_val)

            raw_rate_val = None
            for col_key in rate_aliases:
                if col_key in row and pd.notna(row[col_key]):
                    raw_rate_val = row[col_key]
                    break
            interest_rate = parse_flexible_interest_rate(raw_rate_val)

            raw_amount = re.sub(r"[^\d.]", "", str(row.get("so_tien_vay") or row.get("amount") or "0"))
            raw_balance = re.sub(r"[^\d.]", "", str(row.get("du_no_hien_tai") or row.get("du_no") or row.get("balance") or "0"))

            records.append({
                "loan_id": loan_id,
                "borrower_type": borrower_type,
                "borrower_id": borrower_id,
                "borrower_name": borrower_name if borrower_name else "CHƯA CẬP NHẬT",
                "amount": float(raw_amount) if raw_amount else 0.0,
                "balance": float(raw_balance) if raw_balance else 0.0,
                "start_date": start_date,
                "term_months": term_months,
                "interest_rate": interest_rate,
                "collateral": str(row.get("tai_san_dam_bao") or row.get("collateral") or "N/A"),
                "status": str(row.get("trang_thai") or row.get("status") or "ACTIVE").strip().upper(),
                "purpose": str(row.get("muc_dich_vay") or row.get("purpose") or "Cấp tín dụng phục vụ SXKD")
            })

        if not records:
            raise HTTPException(status_code=400, detail="Không tìm thấy dòng dữ liệu hồ sơ tín dụng hợp lệ.")

        cypher_batch_query = """
        MERGE (b:Bank {name: "DVBank"})
        WITH b
        UNWIND $batch AS row
        MERGE (l:Loan {loan_id: row.loan_id})
        SET l.amount = row.amount, 
            l.balance = row.balance, 
            l.start_date = row.start_date,
            l.term_months = row.term_months, 
            l.interest_rate = row.interest_rate, 
            l.collateral = row.collateral,
            l.status = row.status,
            l.purpose = row.purpose, 
            l.updated_at = datetime()
        MERGE (l)-[:FROM_BANK]->(b)

        FOREACH (_ IN CASE WHEN row.borrower_type = "PERSON" THEN [1] ELSE [] END |
            MERGE (p:Person {cccd: row.borrower_id})
            ON CREATE SET 
                p.full_name = row.borrower_name, 
                p.cif = 'CIF-' + substring(row.borrower_id, 0, 6), 
                p.created_at = datetime()
            ON MATCH SET 
                p.full_name = CASE WHEN (p.full_name IS NULL OR p.full_name = "" OR p.full_name = "CHƯA CẬP NHẬT") THEN row.borrower_name ELSE p.full_name END,
                p.updated_at = datetime()
            MERGE (p)-[r:BORROWED]->(l)
            SET r.role = "PRIMARY_BORROWER", r.updated_at = datetime()
        )

        FOREACH (_ IN CASE WHEN row.borrower_type = "COMPANY" THEN [1] ELSE [] END |
            MERGE (c:Company {tax_code: row.borrower_id})
            ON CREATE SET 
                c.name = row.borrower_name, 
                c.created_at = datetime()
            ON MATCH SET 
                c.name = CASE WHEN (c.name IS NULL OR c.name = "" OR c.name = "CHƯA CẬP NHẬT") THEN row.borrower_name ELSE c.name END,
                c.updated_at = datetime()
            MERGE (c)-[r:BORROWED]->(l)
            SET r.role = "PRIMARY_BORROWER", r.updated_at = datetime()
        )
        """
        db_client.execute_query(cypher_batch_query, {"batch": records})

        return {
            "status": "INGESTED_SUCCESSFULLY",
            "total_records": len(records),
            "preview_data": records[:10],
            "message": f"Đã nạp thành công {len(records)} hồ sơ tín dụng vào Đồ thị DVBank."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi nạp hợp đồng: {str(e)}")

# =============================================================================
# 2. NẠP HỒ SƠ KHÁCH HÀNG GỐC (ĐỌC DTYPE=STR & CHUẨN HÓA SĐT/CCCD/MST)
# =============================================================================
@router.post("/import/customers")
def import_customer_profiles_excel(
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .xlsx, .xls hoặc .csv.")

    try:
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents), dtype=str) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(contents), dtype=str)
        df.columns = [str(col).strip().lower() for col in df.columns]

        id_aliases = ["mst/cccd", "cccd/mst", "mst_cccd", "cccd_mst", "dinh_danh", "mst", "cccd", "tax_code", "identifier"]
        name_aliases = ["ten_khach_hang", "ten_nguoi_vay", "ten_doanh_nghiep", "ho_ten", "full_name", "name"]
        date_aliases = ["ngay_sinh/ngay_thanh_lap", "ngay_sinh", "ngay_thanh_lap", "dob", "established_date"]
        type_aliases = ["loai_khach_hang", "loai_hinh", "customer_type", "type"]
        address_aliases = ["dia_chi", "address", "dia_chi_thuong_tru", "dia_chi_tru_so"]
        phone_aliases = ["sdt", "phone", "so_dien_thoai", "dien_thoai"]
        gender_aliases = ["gioi_tinh", "gender"]

        records = []
        for _, row in df.iterrows():
            name_val = ""
            for k in name_aliases:
                if k in row and pd.notna(row[k]):
                    val = str(row[k]).strip()
                    if val and val.lower() != "nan":
                        name_val = val.upper()
                        break

            id_val = ""
            for k in id_aliases:
                if k in row and pd.notna(row[k]):
                    val = str(row[k]).strip()
                    if val and val.lower() != "nan":
                        id_val = val
                        break
            clean_id = clean_identifier(id_val)
            if not clean_id:
                continue

            raw_type = ""
            for k in type_aliases:
                if k in row and pd.notna(row[k]):
                    raw_type = str(row[k]).strip().upper()
                    break
            
            is_person = any(w in raw_type for w in ["CÁ NHÂN", "CA NHAN", "PERSON", "INDIVIDUAL"]) or (len(clean_id) == 12 and not any(w in raw_type for w in ["TỔ CHỨC", "DOANH"]))
            cust_type = "PERSON" if is_person else "COMPANY"

            raw_date = None
            for k in date_aliases:
                if k in row and pd.notna(row[k]):
                    raw_date = row[k]
                    break
            date_val = parse_flexible_date(raw_date)

            raw_gender = ""
            for k in gender_aliases:
                if k in row and pd.notna(row[k]):
                    raw_gender = str(row[k]).strip()
                    break
            gender_val = raw_gender if (is_person and raw_gender and raw_gender.lower() != "nan") else None

            raw_addr = ""
            for k in address_aliases:
                if k in row and pd.notna(row[k]):
                    raw_addr = str(row[k]).strip()
                    break

            raw_phone = ""
            for k in phone_aliases:
                if k in row and pd.notna(row[k]):
                    raw_phone = str(row[k]).strip()
                    break

            phone_val = clean_phone_number(raw_phone)
            raw_email = str(row.get("email", "")).strip()

            records.append({
                "customer_type": cust_type,
                "identifier": clean_id,
                "name": name_val if name_val else "CHƯA CẬP NHẬT",
                "date_val": date_val,
                "gender": gender_val,
                "address": raw_addr if raw_addr and raw_addr.lower() != "nan" else "NOT_FOUND",
                "phone": phone_val,
                "email": raw_email if raw_email and raw_email.lower() != "nan" else "NOT_FOUND",
            })

        if not records:
            raise HTTPException(status_code=400, detail="Không tìm thấy dòng dữ liệu hồ sơ khách hàng hợp lệ.")

        cypher_upsert_query = """
        UNWIND $batch AS row
        
        FOREACH (_ IN CASE WHEN row.customer_type = "PERSON" THEN [1] ELSE [] END |
            MERGE (p:Person {cccd: row.identifier})
            ON CREATE SET 
                p.full_name = row.name,
                p.dob = row.date_val,
                p.gender = coalesce(row.gender, "Nam"),
                p.nationality = "Việt Nam",
                p.address = row.address,
                p.phone = row.phone,
                p.email = row.email,
                p.cif = 'CIF-' + substring(row.identifier, 0, 6),
                p.created_at = datetime()
            ON MATCH SET 
                p.full_name = coalesce(row.name, p.full_name),
                p.dob = CASE WHEN row.date_val <> "NOT_FOUND" AND row.date_val <> "2025-01-01" THEN row.date_val ELSE p.dob END,
                p.gender = CASE WHEN row.gender IS NOT NULL AND row.gender <> "" THEN row.gender ELSE p.gender END,
                p.address = CASE WHEN row.address <> "NOT_FOUND" THEN row.address ELSE p.address END,
                p.phone = CASE WHEN row.phone <> "NOT_FOUND" THEN row.phone ELSE p.phone END,
                p.email = CASE WHEN row.email <> "NOT_FOUND" THEN row.email ELSE p.email END,
                p.updated_at = datetime()
        )

        FOREACH (_ IN CASE WHEN row.customer_type = "COMPANY" THEN [1] ELSE [] END |
            MERGE (c:Company {tax_code: row.identifier})
            ON CREATE SET 
                c.name = row.name,
                c.established_date = row.date_val,
                c.nationality = "Việt Nam",
                c.address = row.address,
                c.phone = row.phone,
                c.email = row.email,
                c.created_at = datetime()
            ON MATCH SET 
                c.name = coalesce(row.name, c.name),
                c.established_date = CASE WHEN row.date_val <> "NOT_FOUND" AND row.date_val <> "2025-01-01" THEN row.date_val ELSE c.established_date END,
                c.address = CASE WHEN row.address <> "NOT_FOUND" THEN row.address ELSE c.address END,
                c.phone = CASE WHEN row.phone <> "NOT_FOUND" THEN row.phone ELSE c.phone END,
                c.email = CASE WHEN row.email <> "NOT_FOUND" THEN row.email ELSE c.email END,
                c.updated_at = datetime()
        )
        """
        db_client.execute_query(cypher_upsert_query, {"batch": records})

        return {
            "status": "INGESTED_SUCCESSFULLY",
            "total_records": len(records),
            "preview_data": records,
            "message": f"Đã đồng bộ thành công {len(records)} hồ sơ khách hàng (Cá nhân & Doanh nghiệp) vào Master Database."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi nạp hồ sơ khách hàng: {str(e)}")

# =============================================================
# 3. NẠP DANH SÁCH MỐI QUAN HỆ TRỰC TIẾP (CHUẨN HÓA ĐỊNH DANH 100%)
# =============================================================
@router.post("/import/related-parties")
def import_related_parties_excel(
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .xlsx, .xls hoặc .csv.")

    try:
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents), dtype=str) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(contents), dtype=str)
        df.columns = [str(col).strip().lower() for col in df.columns]

        batch_nodes_person = {}
        batch_nodes_company = {}
        batch_family = []
        batch_person_company = []
        batch_company_company = []
        preview_records = []

        for _, row in df.iterrows():
            raw_goc_id = str(row.get('dinh_danh_goc', '')).strip()
            goc_id = clean_identifier(raw_goc_id)
            goc_name = str(row.get('ten_thuc_the_goc', '')).strip().upper()
            goc_type_raw = str(row.get('loai_thuc_the_goc', '')).strip().upper()
            is_goc_person = any(k in goc_type_raw for k in ["CÁ NHÂN", "CA NHAN", "PERSON", "INDIVIDUAL"]) or (len(goc_id) == 12 and not any(k in goc_type_raw for k in ["TỔ CHỨC", "DOANH"]))
            goc_type = "PERSON" if is_goc_person else "COMPANY"

            raw_dich_id = str(row.get('dinh_danh_dich', '')).strip()
            dich_id = clean_identifier(raw_dich_id)
            dich_name = str(row.get('ten_thuc_the_dich', '')).strip().upper()
            dich_type_raw = str(row.get('loai_thuc_the_dich', '')).strip().upper()
            is_dich_person = any(k in dich_type_raw for k in ["CÁ NHÂN", "CA NHAN", "PERSON", "INDIVIDUAL"]) or (len(dich_id) == 12 and not any(k in dich_type_raw for k in ["TỔ CHỨC", "DOANH"]))
            dich_type = "PERSON" if is_dich_person else "COMPANY"

            if not goc_id or not dich_id:
                continue

            if goc_type == "PERSON":
                batch_nodes_person[goc_id] = goc_name
            else:
                batch_nodes_company[goc_id] = goc_name

            if dich_type == "PERSON":
                batch_nodes_person[dich_id] = dich_name
            else:
                batch_nodes_company[dich_id] = dich_name

            point_raw = str(row.get('loai_quan_he', '')).strip().lower().replace('điểm', '').replace('diem', '').strip()
            rel_detail = str(row.get('moi_quan_he_chi_tiet', '')).strip()
            ratio_str, ratio_float = parse_ownership_ratio_flexible(row.get('ty_le_so_huu'))

            if not point_raw or point_raw == 'nan':
                if goc_type == "PERSON" and dich_type == "PERSON":
                    point = "d"
                elif goc_type == "COMPANY" and dich_type == "COMPANY":
                    point = "a"
                elif ratio_float >= 5.0:
                    point = "c"
                else:
                    point = "b"
            else:
                point = point_raw

            position = rel_detail if any(k in rel_detail for k in ["Chủ tịch", "Tổng Giám đốc", "Giám đốc", "HĐQT", "HĐTV", "Kiểm soát viên", "Kế toán trưởng", "Đại diện"]) else "N/A"

            if goc_type == "PERSON" and dich_type == "PERSON":
                batch_family.append({
                    "p1_id": goc_id,
                    "p2_id": dich_id,
                    "relationship": rel_detail,
                    "relation_point": point if point else "d"
                })
            elif (goc_type == "PERSON" and dich_type == "COMPANY") or (goc_type == "COMPANY" and dich_type == "PERSON"):
                person_id = goc_id if goc_type == "PERSON" else dich_id
                company_id = dich_id if goc_type == "PERSON" else goc_id
                batch_person_company.append({
                    "person_id": person_id,
                    "company_id": company_id,
                    "relation_point": point if point else ("c" if ratio_float >= 5.0 else "b"),
                    "relation_subtype": rel_detail,
                    "position": position,
                    "ownership_ratio": ratio_str,
                    "ownership_pct": ratio_float
                })
            elif goc_type == "COMPANY" and dich_type == "COMPANY":
                batch_company_company.append({
                    "c1_id": goc_id,
                    "c2_id": dich_id,
                    "relation_point": point if point else "a",
                    "relation_subtype": rel_detail,
                    "ownership_ratio": ratio_str,
                    "ownership_pct": ratio_float
                })

            preview_records.append({
                "goc_id": goc_id, "goc_name": goc_name, "goc_type": goc_type,
                "dich_id": dich_id, "dich_name": dich_name, "dich_type": dich_type,
                "point": point, "rel_detail": rel_detail, "ratio_str": ratio_str
            })

        if not preview_records:
            raise HTTPException(status_code=400, detail="Không tìm thấy dòng dữ liệu quan hệ hợp lệ.")

        # 1. Upsert Node Person
        if batch_nodes_person:
            person_list = [{"cccd": k, "full_name": v} for k, v in batch_nodes_person.items()]
            cypher_upsert_persons = """
            UNWIND $batch AS row
            MERGE (p:Person {cccd: row.cccd})
            ON CREATE SET p.full_name = row.full_name, p.cif = 'CIF-' + substring(row.cccd, 0, 6), p.created_at = datetime()
            ON MATCH SET p.full_name = coalesce(row.full_name, p.full_name), p.updated_at = datetime()
            """
            db_client.execute_query(cypher_upsert_persons, {"batch": person_list})

        # 2. Upsert Node Company
        if batch_nodes_company:
            company_list = [{"tax_code": k, "name": v} for k, v in batch_nodes_company.items()]
            cypher_upsert_companies = """
            UNWIND $batch AS row
            MERGE (c:Company {tax_code: row.tax_code})
            ON CREATE SET c.name = row.name, c.created_at = datetime()
            ON MATCH SET c.name = coalesce(row.name, c.name), c.updated_at = datetime()
            """
            db_client.execute_query(cypher_upsert_companies, {"batch": company_list})

        # 3. Nối quan hệ Gia đình (:FAMILY)
        if batch_family:
            cypher_family = """
            UNWIND $batch AS row
            MATCH (p1:Person {cccd: row.p1_id}), (p2:Person {cccd: row.p2_id})
            MERGE (p1)-[r:FAMILY]->(p2)
            SET r.relationship = row.relationship,
                r.relation_point = row.relation_point,
                r.relation_subtype = row.relationship,
                r.relation_tier = "mandatory",
                r.review_status = "auto_confirmed",
                r.effective_from = toString(date()),
                r.updated_at = datetime()
            """
            db_client.execute_query(cypher_family, {"batch": batch_family})

        # 4. Nối quan hệ Cá nhân -> Doanh nghiệp (:RELATED_TO)
        if batch_person_company:
            cypher_person_company = """
            UNWIND $batch AS row
            MATCH (p:Person {cccd: row.person_id}), (c:Company {tax_code: row.company_id})
            MERGE (p)-[r:RELATED_TO {relation_point: row.relation_point}]->(c)
            SET r.relation_subtype = row.relation_subtype,
                r.position = row.position,
                r.ownership_ratio = row.ownership_ratio,
                r.ownership_pct = row.ownership_pct,
                r.relation_tier = "mandatory",
                r.review_status = "auto_confirmed",
                r.effective_from = toString(date()),
                r.updated_at = datetime()
            """
            db_client.execute_query(cypher_person_company, {"batch": batch_person_company})

        # 5. Nối quan hệ Doanh nghiệp -> Doanh nghiệp (:RELATED_TO)
        if batch_company_company:
            cypher_company_company = """
            UNWIND $batch AS row
            MATCH (c1:Company {tax_code: row.c1_id}), (c2:Company {tax_code: row.c2_id})
            MERGE (c1)-[r:RELATED_TO {relation_point: row.relation_point}]->(c2)
            SET r.relation_subtype = row.relation_subtype,
                r.position = "N/A",
                r.ownership_ratio = row.ownership_ratio,
                r.ownership_pct = row.ownership_pct,
                r.relation_tier = "mandatory",
                r.review_status = "auto_confirmed",
                r.effective_from = toString(date()),
                r.updated_at = datetime()
            """
            db_client.execute_query(cypher_company_company, {"batch": batch_company_company})

        return {
            "status": "INGESTED_SUCCESSFULLY",
            "total_records": len(preview_records),
            "preview_data": preview_records,
            "message": f"Đã đồng bộ thành công {len(preview_records)} mối quan hệ trực tiếp vào Master Database."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi nạp mối quan hệ: {str(e)}")

# =============================================================
# 4. NẠP TÀI KHOẢN NGƯỜI DÙNG HỆ THỐNG
# =============================================================
@router.post("/import/users")
def import_user_accounts_excel(
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .xlsx, .xls hoặc .csv.")

    try:
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents), dtype=str) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(contents), dtype=str)
        df.columns = [str(col).strip().lower() for col in df.columns]

        required_cols = {"username", "password", "full_name", "role"}
        missing = required_cols - set(df.columns)
        if missing:
            raise HTTPException(status_code=400, detail=f"Tệp Excel thiếu các cột bắt buộc: {', '.join(missing)}")

        records = []
        for _, row in df.iterrows():
            uname = str(row.get("username", "")).strip()
            raw_pwd = str(row.get("password", "")).strip()
            fname = str(row.get("full_name", "")).strip()
            role_val = str(row.get("role", "CREDIT_OFFICER")).strip().upper()

            if not uname or not raw_pwd:
                continue

            if role_val not in ["CREDIT_OFFICER", "DATA_ADMIN"]:
                role_val = "DATA_ADMIN" if "ADMIN" in role_val else "CREDIT_OFFICER"

            phone_val = clean_phone_number(row.get("so_dien_thoai", "N/A"))

            records.append({
                "username": uname,
                "hashed_password": get_password_hash(raw_pwd),
                "full_name": fname if fname else uname,
                "role": role_val,
                "email": str(row.get("email", "N/A")).strip(),
                "phone": phone_val,
                "status": str(row.get("trang_thai", "ACTIVE")).strip().upper()
            })

        if not records:
            raise HTTPException(status_code=400, detail="Không tìm thấy dòng tài khoản người dùng hợp lệ.")

        cypher_users_query = """
        UNWIND $batch AS row
        MERGE (usr:User {username: row.username})
        ON CREATE SET 
            usr.full_name = row.full_name,
            usr.hashed_password = row.hashed_password,
            usr.role = row.role,
            usr.email = row.email,
            usr.phone = row.phone,
            usr.status = row.status,
            usr.created_at = datetime()
        ON MATCH SET 
            usr.full_name = row.full_name,
            usr.hashed_password = row.hashed_password,
            usr.role = row.role,
            usr.email = CASE WHEN row.email <> "N/A" THEN row.email ELSE usr.email END,
            usr.phone = CASE WHEN row.phone <> "N/A" THEN row.phone ELSE usr.phone END,
            usr.status = row.status,
            usr.updated_at = datetime()
        """
        db_client.execute_query(cypher_users_query, {"batch": records})

        preview_list = [
            {
                "username": r["username"],
                "full_name": r["full_name"],
                "role": r["role"],
                "email": r["email"],
                "status": r["status"]
            }
            for r in records[:10]
        ]

        return {
            "status": "INGESTED_SUCCESSFULLY",
            "total_users_created": len(records),
            "preview_data": preview_list,
            "message": f"Đã khởi tạo và đồng bộ thành công {len(records)} tài khoản người dùng vào hệ thống."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi nạp tài khoản người dùng: {str(e)}")

# =============================================================
# 5. QUẢN TRỊ THAM SỐ NGÂN HÀNG & NGUỒN VỐN TỰ CÓ
# =============================================================
@router.get("/bank-config")
def get_bank_config(current_user: Any = Depends(get_current_user)):
    from app.services.rule_engine import GraphRuleEngine
    return GraphRuleEngine.get_bank_config()

@router.put("/bank-config")
def update_bank_config(
    payload: BankConfigRequest,
    current_user: Any = Depends(get_current_user)
):
    username = getattr(current_user, "username", "admin")
    
    if payload.equity_capital <= 0:
        raise HTTPException(status_code=400, detail="Vốn tự có của ngân hàng phải lớn hơn 0.")

    update_query = """
    MERGE (b:Bank {name: $name})
    SET 
        b.full_name = $full_name,
        b.equity_capital = $equity_capital,
        b.charter_capital = $charter_capital,
        b.single_limit_ratio = $single_limit_ratio,
        b.group_limit_ratio = $group_limit_ratio,
        b.updated_by = $updated_by,
        b.updated_at = datetime()
    RETURN 
        b.name AS name,
        b.full_name AS full_name,
        b.equity_capital AS equity_capital,
        b.charter_capital AS charter_capital,
        b.single_limit_ratio AS single_limit_ratio,
        b.group_limit_ratio AS group_limit_ratio,
        toString(b.updated_at) AS updated_at
    """
    res = db_client.execute_query(
        update_query,
        {
            "name": payload.name or "DVBank",
            "full_name": payload.full_name or "Ngân hàng Thương mại Cổ phần DVBank",
            "equity_capital": float(payload.equity_capital),
            "charter_capital": float(payload.charter_capital or 0.0),
            "single_limit_ratio": float(payload.single_limit_ratio or 0.13),
            "group_limit_ratio": float(payload.group_limit_ratio or 0.21),
            "updated_by": username
        }
    )

    return {
        "status": "BANK_CONFIG_UPDATED",
        "data": res[0] if res else {},
        "message": "Đã cập nhật Vốn tự có và các tham số ngân hàng thành công vào Master Database."
    }