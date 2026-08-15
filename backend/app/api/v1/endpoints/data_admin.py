import os
import re
import io
import pandas as pd
from typing import Any, List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.api.deps import get_current_user
from app.db.neo4j_client import db_client
from app.core.security import get_password_hash

router = APIRouter()

# =============================================================================
# 1. NẠP HỒ SƠ TÍN DỤNG
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
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(contents))
        df.columns = [str(col).strip().lower() for col in df.columns]
        
        required_cols = {"ma_tin_dung", "cccd_nguoi_vay", "ten_nguoi_vay", "so_tien_vay", "du_no_hien_tai", "trang_thai"}
        missing = required_cols - set(df.columns)
        if missing:
            raise HTTPException(status_code=400, detail=f"Tệp thiếu cột: {', '.join(missing)}")

        records = []
        for _, row in df.iterrows():
            cccd_clean = re.sub(r"[^\d]", "", str(row.get("cccd_nguoi_vay", "")))
            if not cccd_clean:
                continue

            raw_amount = re.sub(r"[^\d.]", "", str(row.get("so_tien_vay", "0")))
            raw_balance = re.sub(r"[^\d.]", "", str(row.get("du_no_hien_tai", "0")))
            
            records.append({
                "loan_id": str(row.get("ma_tin_dung", "")).strip().upper(),
                "cccd": cccd_clean,
                "full_name": str(row.get("ten_nguoi_vay", "")).strip().upper(),
                "amount": float(raw_amount) if raw_amount else 0.0,
                "balance": float(raw_balance) if raw_balance else 0.0,
                "start_date": str(row.get("ngay_bat_dau", "2025-01-01")),
                "term_months": int(row.get("thoi_han_thang", 12)) if str(row.get("thoi_han_thang")).isdigit() else 12,
                "interest_rate": float(row.get("lai_suat_nam", 8.5)) if str(row.get("lai_suat_nam")).replace(".", "").isdigit() else 8.5,
                "status": str(row.get("trang_thai", "ACTIVE")).strip().upper(),
                "purpose": str(row.get("muc_dich_vay", "Cấp tín dụng phục vụ SXKD"))
            })

        cypher_batch_query = """
        MERGE (b:Bank {name: "DVBank"})
        WITH b
        UNWIND $batch AS row
        MERGE (p:Person {cccd: row.cccd})
        ON CREATE SET p.full_name = row.full_name, p.cif = 'CIF-' + substring(row.cccd, 0, 6), p.created_at = datetime()
        ON MATCH SET p.full_name = coalesce(row.full_name, p.full_name), p.updated_at = datetime()
        MERGE (l:Loan {loan_id: row.loan_id})
        SET l.amount = row.amount, l.balance = row.balance, l.start_date = row.start_date,
            l.term_months = row.term_months, l.interest_rate = row.interest_rate, l.status = row.status,
            l.purpose = row.purpose, l.updated_at = datetime()
        MERGE (p)-[r:BORROWED]->(l)
        SET r.role = "PRIMARY_BORROWER", r.updated_at = datetime()
        MERGE (l)-[:FROM_BANK]->(b)
        """
        db_client.execute_query(cypher_batch_query, {"batch": records})

        return {
            "status": "INGESTED_SUCCESSFULLY",
            "total_records": len(records),
            "preview_data": records[:10],
            "message": f"Đã nạp thành công {len(records)} hồ sơ hợp đồng tín dụng vào Đồ thị DVBank."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi nạp hợp đồng: {str(e)}")

# =============================================================================
# 2. NẠP THỰC THỂ CÁ NHÂN & MẠNG LƯỚI QUAN HỆ
# =============================================================================
@router.post("/import/persons")
def import_persons_master_excel(
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .xlsx, .xls hoặc .csv.")

    try:
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(contents))
        df.columns = [str(col).strip().lower() for col in df.columns]

        required_cols = {"cccd", "ho_ten"}
        missing = required_cols - set(df.columns)
        if missing:
            raise HTTPException(status_code=400, detail=f"Tệp thiếu cột: {', '.join(missing)}")

        records = []
        for _, row in df.iterrows():
            main_cccd = re.sub(r"[^\d]", "", str(row.get("cccd", "")))
            if not main_cccd:
                continue

            rel_type = str(row.get("loai_lien_quan", "PERSON")).strip().upper()
            rel_id = re.sub(r"[^\d]", "", str(row.get("dinh_danh_lien_quan", "")))
            rel_name = str(row.get("ten_nguoi_lien_quan", "")).strip()

            records.append({
                "cccd": main_cccd,
                "full_name": str(row.get("ho_ten", "")).strip().upper(),
                "dob": str(row.get("ngay_sinh", "NOT_FOUND")),
                "gender": str(row.get("gioi_tinh", "Nam")).strip(),
                "nationality": str(row.get("quoc_tich", "Việt Nam")).strip(),
                "place_of_origin": str(row.get("que_quan", "NOT_FOUND")),
                "address": str(row.get("dia_chi_thuong_tru", "NOT_FOUND")),
                "expiry_date": str(row.get("gia_tri_den_ngay", "NOT_FOUND")),
                "phone": str(row.get("so_dien_thoai", "NOT_FOUND")),
                "email": str(row.get("email", "NOT_FOUND")),
                "rel_type": "COMPANY" if "COMP" in rel_type or "DOANH" in rel_type else "PERSON",
                "rel_id": rel_id if rel_id else "",
                "rel_name": rel_name if rel_name != "nan" else "",
                "relationship": str(row.get("moi_quan_he", "Người có liên quan")).strip(),
                "ownership_ratio": str(row.get("ty_le_von", "0%")).strip()
            })

        if not records:
            raise HTTPException(status_code=400, detail="Không tìm thấy dòng dữ liệu cá nhân hợp lệ.")

        cypher_person_query = """
        UNWIND $batch AS row
        MERGE (p:Person {cccd: row.cccd})
        ON CREATE SET 
            p.full_name = row.full_name, p.dob = row.dob, p.gender = row.gender,
            p.nationality = row.nationality, p.place_of_origin = row.place_of_origin,
            p.address = row.address, p.expiry_date = row.expiry_date,
            p.phone = row.phone, p.email = row.email,
            p.cif = 'CIF-' + substring(row.cccd, 0, 6), p.created_at = datetime()
        ON MATCH SET 
            p.full_name = coalesce(row.full_name, p.full_name),
            p.address = CASE WHEN row.address <> "NOT_FOUND" THEN row.address ELSE p.address END,
            p.phone = CASE WHEN row.phone <> "NOT_FOUND" THEN row.phone ELSE p.phone END,
            p.email = CASE WHEN row.email <> "NOT_FOUND" THEN row.email ELSE p.email END,
            p.updated_at = datetime()

        FOREACH (_ IN CASE WHEN row.rel_type = "COMPANY" AND row.rel_id <> "" THEN [1] ELSE [] END |
            MERGE (c:Company {tax_code: row.rel_id})
            ON CREATE SET c.name = row.rel_name, c.created_at = datetime()
            MERGE (p)-[r:OWNERSHIP]->(c)
            SET r.ratio = row.ownership_ratio, r.label = "Cổ đông / Sở hữu", r.relationship = row.relationship, r.updated_at = datetime()
        )

        FOREACH (_ IN CASE WHEN row.rel_type = "PERSON" AND row.rel_id <> "" THEN [1] ELSE [] END |
            MERGE (rp:Person {cccd: row.rel_id})
            ON CREATE SET rp.full_name = row.rel_name, rp.cif = 'CIF-' + substring(row.rel_id, 0, 6), rp.created_at = datetime()
            MERGE (p)-[r:FAMILY]->(rp)
            SET r.relationship = row.relationship, r.ratio = row.ownership_ratio, r.updated_at = datetime()
        )
        """
        db_client.execute_query(cypher_person_query, {"batch": records})

        return {
            "status": "INGESTED_SUCCESSFULLY",
            "total_rows_processed": len(records),
            "preview_data": records[:10],
            "message": f"Đã đồng bộ thành công {len(records)} dòng hồ sơ cá nhân và mạng lưới liên quan vào Neo4j."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi nạp thực thể cá nhân: {str(e)}")

# =============================================================================
# 3. NẠP THỰC THỂ DOANH NGHIỆP & MẠNG LƯỚI ĐIỀU 136
# =============================================================================
@router.post("/import/companies")
def import_companies_master_excel(
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .xlsx, .xls hoặc .csv.")

    try:
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(contents))
        df.columns = [str(col).strip().lower() for col in df.columns]

        required_cols = {"ma_so_doanh_nghiep", "ten_doanh_nghiep", "ho_ten_dai_dien", "cccd_dai_dien"}
        missing = required_cols - set(df.columns)
        if missing:
            raise HTTPException(status_code=400, detail=f"Tệp Excel thiếu các cột bắt buộc: {', '.join(missing)}")

        records = []
        for _, row in df.iterrows():
            tax_code_clean = str(row.get("ma_so_doanh_nghiep", "")).strip()
            if not tax_code_clean or tax_code_clean == "nan":
                continue

            rep_cccd_clean = re.sub(r"[^\d]", "", str(row.get("cccd_dai_dien", "")))
            rel_type = str(row.get("loai_lien_quan", "ORGANIZATION")).strip().upper()
            rel_id = str(row.get("dinh_danh_lien_quan", "")).strip()
            rel_name = str(row.get("ten_lien_quan", "")).strip()

            records.append({
                "tax_code": tax_code_clean,
                "company_name": str(row.get("ten_doanh_nghiep", "")).strip().upper(),
                "short_name": str(row.get("ten_viet_tat", "NOT_FOUND")).strip(),
                "charter_capital": str(row.get("von_dieu_le", "NOT_FOUND")).strip(),
                "business_sector": str(row.get("nganh_nghe", "NOT_FOUND")).strip(),
                "headquarters_address": str(row.get("dia_chi_tru_so", "NOT_FOUND")).strip(),
                "rep_name": str(row.get("ho_ten_dai_dien", "")).strip().upper(),
                "rep_cccd": rep_cccd_clean,
                "rep_position": str(row.get("chuc_vu_dai_dien", "Người đại diện theo pháp luật")).strip(),
                "rep_phone": str(row.get("sdt_dai_dien", "NOT_FOUND")).strip(),
                "rep_email": str(row.get("email_dai_dien", "NOT_FOUND")).strip(),
                "rep_address": str(row.get("dia_chi_dai_dien", "NOT_FOUND")).strip(),
                "rel_type": "ORGANIZATION" if "ORG" in rel_type or "DOANH" in rel_type or "TY" in rel_type else "INDIVIDUAL",
                "rel_id": rel_id if rel_id != "nan" else "",
                "rel_name": rel_name if rel_name != "nan" else "",
                "rel_nationality": str(row.get("quoc_tich_lien_quan", "Việt Nam")).strip(),
                "rel_group": str(row.get("nhom_quan_he", "Nhóm liên quan Điều 136")).strip(),
                "rel_relationship": str(row.get("moi_quan_he_chi_tiet", "Đối tượng liên quan")).strip(),
                "rel_position": str(row.get("chuc_vu_lien_quan", "N/A")).strip(),
                "rel_ratio": str(row.get("ty_le_von", "0%")).strip()
            })

        if not records:
            raise HTTPException(status_code=400, detail="Không tìm thấy dòng dữ liệu doanh nghiệp hợp lệ.")

        cypher_company_query = """
        UNWIND $batch AS row
        MERGE (c:Company {tax_code: row.tax_code})
        ON CREATE SET 
            c.name = row.company_name, c.short_name = row.short_name,
            c.charter_capital = row.charter_capital, c.business_sector = row.business_sector,
            c.address = row.headquarters_address, c.created_at = datetime()
        ON MATCH SET 
            c.name = coalesce(row.company_name, c.name),
            c.short_name = CASE WHEN row.short_name <> "NOT_FOUND" THEN row.short_name ELSE c.short_name END,
            c.charter_capital = CASE WHEN row.charter_capital <> "NOT_FOUND" THEN row.charter_capital ELSE c.charter_capital END,
            c.business_sector = CASE WHEN row.business_sector <> "NOT_FOUND" THEN row.business_sector ELSE c.business_sector END,
            c.address = CASE WHEN row.headquarters_address <> "NOT_FOUND" THEN row.headquarters_address ELSE c.address END,
            c.updated_at = datetime()

        FOREACH (_ IN CASE WHEN row.rep_cccd <> "" THEN [1] ELSE [] END |
            MERGE (rep:Person {cccd: row.rep_cccd})
            ON CREATE SET 
                rep.full_name = row.rep_name, rep.phone = row.rep_phone,
                rep.email = row.rep_email, rep.address = row.rep_address,
                rep.cif = 'CIF-' + substring(row.rep_cccd, 0, 6), rep.created_at = datetime()
            ON MATCH SET 
                rep.full_name = coalesce(row.rep_name, rep.full_name),
                rep.phone = CASE WHEN row.rep_phone <> "NOT_FOUND" THEN row.rep_phone ELSE rep.phone END,
                rep.email = CASE WHEN row.rep_email <> "NOT_FOUND" THEN row.rep_email ELSE rep.email END,
                rep.address = CASE WHEN row.rep_address <> "NOT_FOUND" THEN row.rep_address ELSE rep.address END,
                rep.updated_at = datetime()

            MERGE (rep)-[r_rep:LEGAL_REPRESENTATIVE]->(c)
            SET r_rep.position = row.rep_position, r_rep.updated_at = datetime()
        )

        FOREACH (_ IN CASE WHEN row.rel_type = "ORGANIZATION" AND row.rel_id <> "" THEN [1] ELSE [] END |
            MERGE (target_c:Company {tax_code: row.rel_id})
            ON CREATE SET target_c.name = row.rel_name, target_c.nationality = row.rel_nationality, target_c.created_at = datetime()
            MERGE (c)-[r_org:RELATED_ORGANIZATION]->(target_c)
            SET r_org.relationship_group = row.rel_group, r_org.specific_relationship = row.rel_relationship,
                r_org.position = row.rel_position, r_org.ownership_ratio = row.rel_ratio, r_org.updated_at = datetime()
        )

        FOREACH (_ IN CASE WHEN row.rel_type = "INDIVIDUAL" AND row.rel_id <> "" THEN [1] ELSE [] END |
            MERGE (target_p:Person {cccd: row.rel_id})
            ON CREATE SET target_p.full_name = row.rel_name, target_p.nationality = row.rel_nationality, target_p.cif = 'CIF-' + substring(row.rel_id, 0, 6), target_p.created_at = datetime()
            MERGE (target_p)-[r_p:RELATED_PERSON]->(c)
            SET r_p.relationship_group = row.rel_group, r_p.specific_relationship = row.rel_relationship,
                r_p.position = row.rel_position, r_p.ownership_ratio = row.rel_ratio, r_p.updated_at = datetime()
        )
        """
        db_client.execute_query(cypher_company_query, {"batch": records})

        return {
            "status": "INGESTED_SUCCESSFULLY",
            "total_rows_processed": len(records),
            "preview_data": records[:10],
            "message": f"Đã đồng bộ thành công {len(records)} dòng hồ sơ doanh nghiệp và mạng lưới liên quan vào Neo4j."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi nạp thực thể doanh nghiệp: {str(e)}")

# =============================================================================
# 4. NẠP TÀI KHOẢN NGƯỜI DÙNG HỆ THỐNG (USER ACCOUNTS)
# =============================================================================
@router.post("/import/users")
def import_user_accounts_excel(
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    """
    Nạp danh sách Tài khoản Người dùng Hệ thống (Cán bộ tín dụng / Data Admin) vào Neo4j.
    Tự động hash mật khẩu Bcrypt và lưu trữ vào node :User.
    """
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .xlsx, .xls hoặc .csv.")

    try:
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(contents))
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

            # Chuẩn hóa role hợp lệ
            if role_val not in ["CREDIT_OFFICER", "DATA_ADMIN"]:
                role_val = "DATA_ADMIN" if "ADMIN" in role_val else "CREDIT_OFFICER"

            records.append({
                "username": uname,
                "hashed_password": get_password_hash(raw_pwd),
                "full_name": fname if fname else uname,
                "role": role_val,
                "email": str(row.get("email", "N/A")).strip(),
                "phone": str(row.get("so_dien_thoai", "N/A")).strip(),
                "status": str(row.get("trang_thai", "ACTIVE")).strip().upper()
            })

        if not records:
            raise HTTPException(status_code=400, detail="Không tìm thấy dòng tài khoản người dùng hợp lệ trong tệp.")

        # Cypher Upsert Node :User
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

        # Trả về danh sách preview (không trả hashed_password để bảo mật)
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