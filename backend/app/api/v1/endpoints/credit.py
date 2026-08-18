import os
import re
import shutil
import uuid
from datetime import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from pydantic import BaseModel
from app.services.extractor import DocumentExtractionService
from app.services.rule_engine import GraphRuleEngine
from app.api.deps import get_current_user
from app.db.neo4j_client import db_client

router = APIRouter()


# =============================================================================
# SCHEMAS DTO
# =============================================================================
class IndividualProfileDTO(BaseModel):
    full_name: str
    cccd_id: str
    dob: Optional[str] = "NOT_FOUND"
    gender: Optional[str] = "Nam"
    nationality: Optional[str] = "Việt Nam"
    place_of_origin: Optional[str] = "NOT_FOUND"
    place_of_residence: Optional[str] = "NOT_FOUND"
    date_of_expiry: Optional[str] = "NOT_FOUND"
    phone: Optional[str] = "NOT_FOUND"
    email: Optional[str] = "NOT_FOUND"

class EnterpriseProfileDTO(BaseModel):
    company_name: str
    short_name: Optional[str] = "NOT_FOUND"
    tax_code: str
    charter_capital: Optional[str] = "NOT_FOUND"
    headquarters_address: Optional[str] = "NOT_FOUND"
    business_sector: Optional[str] = "NOT_FOUND"
    nationality: Optional[str] = "Việt Nam"

class RepresentativeDTO(BaseModel):
    full_name: str
    cccd_id: str
    dob: Optional[str] = "NOT_FOUND"
    gender: Optional[str] = "Nam"
    nationality: Optional[str] = "Việt Nam"
    position: Optional[str] = "Người đại diện theo pháp luật / Giám đốc"
    phone: Optional[str] = "NOT_FOUND"
    email: Optional[str] = "NOT_FOUND"
    current_address: Optional[str] = "NOT_FOUND"

class LoanDetailsDTO(BaseModel):
    loan_id: str
    purpose: Optional[str] = "Vay vốn sản xuất kinh doanh"
    loan_amount: Optional[str] = "0"
    term_months: Optional[str] = "12"
    repayment_source: Optional[str] = "Doanh thu hoạt động SXKD"

class BridgeEntityDTO(BaseModel):
    name: Optional[str] = ""
    identifier: Optional[str] = ""
    role_or_relationship: Optional[str] = ""

class RelatedEntityDTO(BaseModel):
    id: Optional[str] = None
    entity_type: str = "INDIVIDUAL"
    name: str
    identifier: Optional[str] = "NOT_FOUND"
    nationality: Optional[str] = "Việt Nam"
    relation_point: Optional[str] = "d"
    relation_tier: Optional[str] = "mandatory"
    specific_relationship: str
    position: Optional[str] = "N/A"
    ownership_ratio: Optional[str] = "0%"
    bridge_kind: Optional[str] = "NONE"
    bridge_entity: Optional[BridgeEntityDTO] = None

class SaveDraftApplicationRequest(BaseModel):
    application_id: str
    loan_id: str
    customer_type: str
    individual_profile: Optional[IndividualProfileDTO] = None
    enterprise_profile: Optional[EnterpriseProfileDTO] = None
    representative: Optional[RepresentativeDTO] = None
    loan_details: LoanDetailsDTO
    related_group: List[RelatedEntityDTO]

class ReviewRelationshipRequest(BaseModel):
    relationship_id: str
    entity_id_1: str
    entity_id_2: str
    review_status: str  # confirmed_related hoặc dismissed
    review_note: Optional[str] = ""

class ApplicationDecisionRequest(BaseModel):
    decision: str
    sync_to_master: bool = False
    note: Optional[str] = ""

# =============================================================================
# 1. GỢI Ý MÃ TÍN DỤNG DUY NHẤT
# =============================================================================
@router.get("/generate-loan-id")
def generate_unique_loan_id(
    customer_type: str = Query("INDIVIDUAL"),
    current_user: Any = Depends(get_current_user)
):
    prefix = "LN" if customer_type == "INDIVIDUAL" else "CORP"
    year_month = datetime.now().strftime("%Y%m")

    query = """
    MATCH (l:Loan) RETURN l.loan_id AS id
    UNION
    MATCH (dl:DraftLoan) RETURN dl.loan_id AS id
    """
    results = db_client.execute_query(query)
    existing_ids = {row["id"] for row in results if row.get("id")}

    index = 1
    while True:
        candidate_id = f"{prefix}-{year_month}-{index:04d}"
        if candidate_id not in existing_ids:
            return {
                "suggested_loan_id": candidate_id,
                "prefix": prefix,
                "created_at": datetime.now().isoformat()
            }
        index += 1

# =============================================================================
# 2. BÓC TÁCH HỒ SƠ PDF
# =============================================================================
@router.post("/process-individual")
def process_individual_application(
    loan_application: UploadFile = File(...),
    national_id: UploadFile = File(...),
    related_declaration: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    app_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
    upload_dir = f"/tmp/monyx_indiv_{app_id}"
    os.makedirs(upload_dir, exist_ok=True)
    officer_username = getattr(current_user, "username", None) or "officer"

    try:
        cccd_path = os.path.join(upload_dir, "cccd.pdf")
        with open(cccd_path, "wb") as f:
            shutil.copyfileobj(national_id.file, f)
        cccd_info = DocumentExtractionService.extract_from_cccd(cccd_path)

        return {
            "application_id": app_id,
            "status": "SUCCESS",
            "officer_in_charge": officer_username,
            "borrower_profile": {
                "full_name": cccd_info.get("full_name", "NOT_FOUND"),
                "cccd_id": cccd_info.get("cccd_id", "NOT_FOUND"),
                "dob": cccd_info.get("dob", "NOT_FOUND"),
                "gender": cccd_info.get("gender", "Nam"),
                "nationality": cccd_info.get("nationality", "Việt Nam"),
                "place_of_origin": cccd_info.get("place_of_origin", "NOT_FOUND"),
                "place_of_residence": cccd_info.get("place_of_residence", "NOT_FOUND"),
                "date_of_expiry": cccd_info.get("date_of_expiry", "NOT_FOUND"),
                "phone": "NOT_FOUND",
                "email": "NOT_FOUND",
            },
            "loan_details": {
                "purpose": "Vay bổ sung vốn sản xuất kinh doanh",
                "loan_amount": "500000000",
                "term_months": "36",
                "repayment_source": "Doanh thu hoạt động sản xuất kinh doanh"
            },
            "related_group": []
        }
    finally:
        shutil.rmtree(upload_dir, ignore_errors=True)

@router.post("/process-enterprise")
def process_enterprise_application(
    loan_application: UploadFile = File(...),
    rep_national_id: UploadFile = File(...),
    business_license: UploadFile = File(...),
    related_declaration: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    app_id = f"CORP-{uuid.uuid4().hex[:8].upper()}"
    upload_dir = f"/tmp/monyx_corp_{app_id}"
    os.makedirs(upload_dir, exist_ok=True)
    officer_username = getattr(current_user, "username", None) or "officer"

    try:
        rep_path = os.path.join(upload_dir, "rep_cccd.pdf")
        with open(rep_path, "wb") as f:
            shutil.copyfileobj(rep_national_id.file, f)
        rep_info = DocumentExtractionService.extract_from_cccd(rep_path)

        return {
            "application_id": app_id,
            "status": "SUCCESS",
            "officer_in_charge": officer_username,
            "enterprise_profile": {
                "company_name": "NOT_FOUND",
                "short_name": "NOT_FOUND",
                "tax_code": "NOT_FOUND",
                "charter_capital": "50.000.000.000 VND",
                "headquarters_address": "NOT_FOUND",
                "business_sector": "NOT_FOUND",
                "nationality": "Việt Nam",
            },
            "representative": {
                "full_name": rep_info.get("full_name", "NOT_FOUND"),
                "cccd_id": rep_info.get("cccd_id", "NOT_FOUND"),
                "dob": rep_info.get("dob", "NOT_FOUND"),
                "gender": rep_info.get("gender", "Nam"),
                "nationality": rep_info.get("nationality", "Việt Nam"),
                "position": "Người đại diện theo pháp luật / Tổng Giám đốc",
                "phone": "NOT_FOUND",
                "email": "NOT_FOUND",
                "current_address": rep_info.get("place_of_residence", "NOT_FOUND"),
            },
            "loan_details": {
                "purpose": "Vay bổ sung vốn lưu động phục vụ kinh doanh",
                "loan_amount": "5000000000",
                "term_months": "12",
                "repayment_source": "Doanh thu từ hoạt động sản xuất kinh doanh"
            },
            "related_group": []
        }
    finally:
        shutil.rmtree(upload_dir, ignore_errors=True)

# =============================================================
# 3. LƯU HỒ SƠ: UPSERT THỰC THỂ (TRỰC TIẾP & BẮC CẦU) MASTER DB
# =============================================================
@router.post("/save-draft-application")
def save_draft_application(
    payload: SaveDraftApplicationRequest,
    current_user: Any = Depends(get_current_user)
):
    officer_username = getattr(current_user, "username", None) or "officer"
    loan = payload.loan_details
    raw_amount = re.sub(r"[^\d]", "", str(loan.loan_amount or "0"))
    amount_numeric = float(raw_amount) if raw_amount else 0.0

    # -------------------------------------------------------------------------
    # A. KHÁCH HÀNG CÁ NHÂN
    # -------------------------------------------------------------------------
    if payload.customer_type == "INDIVIDUAL":
        borrower = payload.individual_profile
        if not borrower:
            raise HTTPException(status_code=400, detail="Thiếu thông tin người vay cá nhân.")

        cypher_indiv = """
        MERGE (p:Person {cccd: $borrower_cccd})
        ON CREATE SET 
            p.full_name = $borrower_name,
            p.dob = $dob,
            p.gender = $gender,
            p.nationality = $nationality,
            p.place_of_origin = $place_of_origin,
            p.address = $address,
            p.expiry_date = $date_of_expiry,
            p.phone = $phone,
            p.email = $email,
            p.cif = 'CIF-' + substring($borrower_cccd, 0, 6),
            p.created_at = datetime()
        ON MATCH SET 
            p.full_name = CASE WHEN $borrower_name <> '' AND $borrower_name <> 'NOT_FOUND' THEN $borrower_name ELSE p.full_name END,
            p.address = CASE WHEN $address <> '' AND $address <> 'NOT_FOUND' THEN $address ELSE p.address END,
            p.phone = CASE WHEN $phone <> '' AND $phone <> 'NOT_FOUND' THEN $phone ELSE p.phone END,
            p.email = CASE WHEN $email <> '' AND $email <> 'NOT_FOUND' THEN $email ELSE p.email END,
            p.updated_at = datetime()

        MERGE (app:DraftApplication {app_code: $app_code})
        SET app.loan_id = $loan_id,
            app.customer_type = "INDIVIDUAL",
            app.borrower_name = $borrower_name,
            app.identifier = $borrower_cccd,
            app.loan_amount = $loan_amount,
            app.purpose = $purpose,
            app.term_months = $term_months,
            app.repayment_source = $repayment_source,
            app.status = "PENDING",
            app.officer = $officer,
            app.created_at = datetime(),
            app.updated_at = datetime()

        MERGE (dl:DraftLoan {loan_id: $loan_id})
        SET dl.app_code = $app_code,
            dl.amount = $loan_amount,
            dl.purpose = $purpose,
            dl.term_months = $term_months,
            dl.status = "PENDING"

        MERGE (p)-[:DRAFT_APPLIED_FOR]->(app)
        MERGE (app)-[:DRAFT_PROPOSES_LOAN]->(dl)
        """
        db_client.execute_query(
            cypher_indiv,
            {
                "borrower_cccd": borrower.cccd_id,
                "borrower_name": borrower.full_name,
                "dob": borrower.dob,
                "gender": borrower.gender,
                "nationality": borrower.nationality or "Việt Nam",
                "place_of_origin": borrower.place_of_origin,
                "address": borrower.place_of_residence,
                "date_of_expiry": borrower.date_of_expiry,
                "phone": borrower.phone,
                "email": borrower.email,
                "app_code": payload.application_id,
                "loan_id": payload.loan_id,
                "loan_amount": amount_numeric,
                "purpose": loan.purpose,
                "term_months": int(loan.term_months) if str(loan.term_months).isdigit() else 12,
                "repayment_source": loan.repayment_source,
                "officer": officer_username,
            }
        )

        for rel in payload.related_group:
            target_id = rel.identifier if rel.identifier and rel.identifier != "NOT_FOUND" else f"TEMP-{uuid.uuid4().hex[:6]}"
            raw_ratio = re.sub(r"[^\d.]", "", str(rel.ownership_ratio or "0"))
            ratio_val = float(raw_ratio) if raw_ratio else 0.0

            # Bắc cầu: Person -> Bridge Person -> Target Company (Điểm đ)
            if rel.bridge_kind == "INDIV_RELATIVE_TO_CORP" and rel.bridge_entity and rel.bridge_entity.identifier:
                bridge_id = rel.bridge_entity.identifier
                bridge_name = rel.bridge_entity.name or "Người thân trung gian"
                bridge_rel = rel.bridge_entity.role_or_relationship or "Vợ/chồng"

                bridge_cypher = """
                MATCH (p:Person {cccd: $borrower_cccd})
                // 1. Upsert Người thân trung gian (Person)
                MERGE (bp:Person {cccd: $bridge_cccd})
                ON CREATE SET bp.full_name = $bridge_name, bp.cif = 'CIF-' + substring($bridge_cccd, 0, 6), bp.created_at = datetime()
                ON MATCH SET bp.full_name = coalesce($bridge_name, bp.full_name), bp.updated_at = datetime()

                // 2. Upsert Doanh nghiệp đích (Company)
                MERGE (tc:Company {tax_code: $target_tax_code})
                ON CREATE SET tc.name = $target_name, tc.created_at = datetime()
                ON MATCH SET tc.name = coalesce($target_name, tc.name), tc.updated_at = datetime()

                // 3. Nối Person -> Bridge Person (Điểm d)
                MERGE (p)-[rf:FAMILY]->(bp)
                SET rf.relationship = $bridge_rel, rf.relation_point = "d", rf.relation_tier = "mandatory", rf.effective_from = toString(date())

                // 4. Nối Bridge Person -> Target Company (Điểm b hoặc Điểm c)
                MERGE (bp)-[ro:RELATED_TO {relation_point: "c"}]->(tc)
                SET ro.relation_subtype = "Lãnh đạo / Cổ đông lớn",
                    ro.ownership_ratio = $ratio_str,
                    ro.ownership_pct = $ownership_pct,
                    ro.relation_tier = "mandatory",
                    ro.review_status = "auto_confirmed",
                    ro.effective_from = toString(date())
                """
                db_client.execute_query(
                    bridge_cypher,
                    {
                        "borrower_cccd": borrower.cccd_id,
                        "bridge_cccd": bridge_id,
                        "bridge_name": bridge_name,
                        "bridge_rel": bridge_rel,
                        "target_tax_code": target_id,
                        "target_name": rel.name,
                        "ratio_str": rel.ownership_ratio or "0%",
                        "ownership_pct": ratio_val
                    }
                )
            else:
                # Quan hệ trực tiếp 0-Hop
                if rel.entity_type in ["ORGANIZATION", "COMPANY"]:
                    rel_comp_cypher = """
                    MATCH (p:Person {cccd: $borrower_cccd})
                    MERGE (c:Company {tax_code: $rel_tax_code})
                    ON CREATE SET c.name = $rel_name, c.nationality = $nationality, c.created_at = datetime()
                    ON MATCH SET c.name = coalesce($rel_name, c.name), c.updated_at = datetime()

                    MERGE (p)-[r:RELATED_TO {relation_point: $rel_point}]->(c)
                    SET r.relation_subtype = $rel_label,
                        r.relation_tier = "mandatory",
                        r.ownership_ratio = $ratio_str,
                        r.ownership_pct = $ownership_pct,
                        r.position = $position,
                        r.review_status = "auto_confirmed",
                        r.effective_from = toString(date()),
                        r.updated_at = datetime()
                    """
                    db_client.execute_query(
                        rel_comp_cypher,
                        {
                            "borrower_cccd": borrower.cccd_id,
                            "rel_tax_code": target_id,
                            "rel_name": rel.name,
                            "nationality": rel.nationality or "Việt Nam",
                            "ratio_str": rel.ownership_ratio or "0%",
                            "ownership_pct": ratio_val,
                            "position": rel.position or "N/A",
                            "rel_point": rel.relation_point or "c",
                            "rel_label": rel.specific_relationship
                        }
                    )
                else:
                    rel_pers_cypher = """
                    MATCH (p:Person {cccd: $borrower_cccd})
                    MERGE (rp:Person {cccd: $rel_cccd})
                    ON CREATE SET rp.full_name = $rel_name, rp.nationality = $nationality, rp.cif = 'CIF-' + substring($rel_cccd, 0, 6), rp.created_at = datetime()
                    ON MATCH SET rp.full_name = coalesce($rel_name, rp.full_name), rp.updated_at = datetime()

                    MERGE (p)-[r:FAMILY]->(rp)
                    SET r.relationship = $rel_label,
                        r.relation_point = "d",
                        r.relation_subtype = $rel_label,
                        r.relation_tier = "mandatory",
                        r.review_status = "auto_confirmed",
                        r.effective_from = toString(date()),
                        r.updated_at = datetime()
                    """
                    db_client.execute_query(
                        rel_pers_cypher,
                        {
                            "borrower_cccd": borrower.cccd_id,
                            "rel_cccd": target_id,
                            "rel_name": rel.name,
                            "nationality": rel.nationality or "Việt Nam",
                            "rel_label": rel.specific_relationship
                        }
                    )

    # -------------------------------------------------------------------------
    # B. KHÁCH HÀNG DOANH NGHIỆP
    # -------------------------------------------------------------------------
    else:
        corp = payload.enterprise_profile
        rep = payload.representative
        if not corp or not rep:
            raise HTTPException(status_code=400, detail="Thiếu thông tin doanh nghiệp hoặc người đại diện.")

        cypher_corp = """
        MERGE (c:Company {tax_code: $tax_code})
        ON CREATE SET 
            c.name = $company_name,
            c.short_name = $short_name,
            c.charter_capital = $charter_capital,
            c.business_sector = $business_sector,
            c.address = $headquarters_address,
            c.nationality = $nationality,
            c.created_at = datetime()
        ON MATCH SET 
            c.name = CASE WHEN $company_name <> '' AND $company_name <> 'NOT_FOUND' THEN $company_name ELSE c.name END,
            c.short_name = CASE WHEN $short_name <> '' AND $short_name <> 'NOT_FOUND' THEN $short_name ELSE c.short_name END,
            c.charter_capital = CASE WHEN $charter_capital <> '' AND $charter_capital <> 'NOT_FOUND' THEN $charter_capital ELSE c.charter_capital END,
            c.address = CASE WHEN $headquarters_address <> '' AND $headquarters_address <> 'NOT_FOUND' THEN $headquarters_address ELSE c.address END,
            c.updated_at = datetime()

        MERGE (rep:Person {cccd: $rep_cccd})
        ON CREATE SET 
            rep.full_name = $rep_name,
            rep.dob = $rep_dob,
            rep.gender = $rep_gender,
            rep.nationality = $rep_nationality,
            rep.phone = $rep_phone,
            rep.email = $rep_email,
            rep.address = $rep_address,
            rep.cif = 'CIF-' + substring($rep_cccd, 0, 6),
            rep.created_at = datetime()
        ON MATCH SET 
            rep.full_name = CASE WHEN $rep_name <> '' AND $rep_name <> 'NOT_FOUND' THEN $rep_name ELSE rep.full_name END,
            rep.address = CASE WHEN $rep_address <> '' AND $rep_address <> 'NOT_FOUND' THEN $rep_address ELSE rep.address END,
            rep.updated_at = datetime()

        MERGE (rep)-[r_rep:LEGAL_REPRESENTATIVE]->(c)
        SET r_rep.position = $rep_position,
            r_rep.relation_point = "b",
            r_rep.relation_subtype = "Người đại diện theo pháp luật",
            r_rep.relation_tier = "mandatory",
            r_rep.review_status = "auto_confirmed",
            r_rep.effective_from = toString(date()),
            r_rep.updated_at = datetime()

        MERGE (app:DraftApplication {app_code: $app_code})
        SET app.loan_id = $loan_id,
            app.customer_type = "ENTERPRISE",
            app.borrower_name = $company_name,
            app.identifier = $tax_code,
            app.loan_amount = $loan_amount,
            app.purpose = $purpose,
            app.term_months = $term_months,
            app.repayment_source = $repayment_source,
            app.status = "PENDING",
            app.officer = $officer,
            app.created_at = datetime(),
            app.updated_at = datetime()

        MERGE (dl:DraftLoan {loan_id: $loan_id})
        SET dl.app_code = $app_code,
            dl.amount = $loan_amount,
            dl.purpose = $purpose,
            dl.term_months = $term_months,
            dl.status = "PENDING"

        MERGE (c)-[:DRAFT_APPLIED_FOR]->(app)
        MERGE (app)-[:DRAFT_PROPOSES_LOAN]->(dl)
        """
        db_client.execute_query(
            cypher_corp,
            {
                "tax_code": corp.tax_code,
                "company_name": corp.company_name,
                "short_name": corp.short_name,
                "charter_capital": corp.charter_capital,
                "business_sector": corp.business_sector,
                "headquarters_address": corp.headquarters_address,
                "nationality": corp.nationality or "Việt Nam",
                "rep_cccd": rep.cccd_id,
                "rep_name": rep.full_name,
                "rep_dob": rep.dob,
                "rep_gender": rep.gender,
                "rep_nationality": rep.nationality or "Việt Nam",
                "rep_phone": rep.phone,
                "rep_email": rep.email,
                "rep_address": rep.current_address,
                "rep_position": rep.position,
                "app_code": payload.application_id,
                "loan_id": payload.loan_id,
                "loan_amount": amount_numeric,
                "purpose": loan.purpose,
                "term_months": int(loan.term_months) if str(loan.term_months).isdigit() else 12,
                "repayment_source": loan.repayment_source,
                "officer": officer_username,
            }
        )

        for rel in payload.related_group:
            target_id = rel.identifier if rel.identifier and rel.identifier != "NOT_FOUND" else f"TEMP-{uuid.uuid4().hex[:6]}"
            raw_ratio = re.sub(r"[^\d.]", "", str(rel.ownership_ratio or "0"))
            ratio_val = float(raw_ratio) if raw_ratio else 0.0

            # 1. Bắc cầu qua Công ty con F1 (Công ty cháu F2 - Điểm a)
            if rel.bridge_kind == "CORP_F1_SUBSIDIARY" and rel.bridge_entity and rel.bridge_entity.identifier:
                f1_cypher = """
                MATCH (c:Company {tax_code: $borrower_tax_code})
                MERGE (f1:Company {tax_code: $f1_tax_code})
                ON CREATE SET f1.name = $f1_name, f1.created_at = datetime()
                ON MATCH SET f1.name = coalesce($f1_name, f1.name), f1.updated_at = datetime()

                MERGE (f2:Company {tax_code: $f2_tax_code})
                ON CREATE SET f2.name = $f2_name, f2.created_at = datetime()
                ON MATCH SET f2.name = coalesce($f2_name, f2.name), f2.updated_at = datetime()

                MERGE (c)-[r1:RELATED_TO {relation_point: "a"}]->(f1)
                SET r1.relation_subtype = "Công ty con (F1)", r1.ownership_pct = $bridge_pct, r1.relation_tier = "mandatory", r1.effective_from = toString(date())

                MERGE (f1)-[r2:RELATED_TO {relation_point: "a"}]->(f2)
                SET r2.relation_subtype = "Công ty con của F1 (Cháu)", r2.ownership_pct = $target_pct, r2.relation_tier = "mandatory", r2.effective_from = toString(date())
                """
                bridge_ratio_raw = re.sub(r"[^\d.]", "", str(rel.bridge_entity.role_or_relationship or "51"))
                db_client.execute_query(
                    f1_cypher,
                    {
                        "borrower_tax_code": corp.tax_code,
                        "f1_tax_code": rel.bridge_entity.identifier,
                        "f1_name": rel.bridge_entity.name or "Công ty con F1",
                        "bridge_pct": float(bridge_ratio_raw) if bridge_ratio_raw else 51.0,
                        "f2_tax_code": target_id,
                        "f2_name": rel.name,
                        "target_pct": ratio_val
                    }
                )

            # 2. Bắc cầu qua Công ty mẹ chung (Công ty chị em - Điểm a)
            elif rel.bridge_kind == "CORP_COMMON_PARENT" and rel.bridge_entity and rel.bridge_entity.identifier:
                parent_cypher = """
                MATCH (c:Company {tax_code: $borrower_tax_code})
                MERGE (p:Company {tax_code: $parent_tax_code})
                ON CREATE SET p.name = $parent_name, p.created_at = datetime()
                ON MATCH SET p.name = coalesce($parent_name, p.name), p.updated_at = datetime()

                MERGE (s:Company {tax_code: $sister_tax_code})
                ON CREATE SET s.name = $sister_name, s.created_at = datetime()
                ON MATCH SET s.name = coalesce($sister_name, s.name), s.updated_at = datetime()

                MERGE (p)-[r1:RELATED_TO {relation_point: "a"}]->(c)
                SET r1.relation_subtype = "Công ty con", r1.ownership_pct = $parent_pct, r1.relation_tier = "mandatory", r1.effective_from = toString(date())

                MERGE (p)-[r2:RELATED_TO {relation_point: "a"}]->(s)
                SET r2.relation_subtype = "Công ty con", r2.ownership_pct = $target_pct, r2.relation_tier = "mandatory", r2.effective_from = toString(date())
                """
                parent_ratio_raw = re.sub(r"[^\d.]", "", str(rel.bridge_entity.role_or_relationship or "51"))
                db_client.execute_query(
                    parent_cypher,
                    {
                        "borrower_tax_code": corp.tax_code,
                        "parent_tax_code": rel.bridge_entity.identifier,
                        "parent_name": rel.bridge_entity.name or "Công ty mẹ chung",
                        "parent_pct": float(parent_ratio_raw) if parent_ratio_raw else 51.0,
                        "sister_tax_code": target_id,
                        "sister_name": rel.name,
                        "target_pct": ratio_val
                    }
                )

            # 3. Bắc cầu qua Công ty mẹ của Người quản lý (Điểm a)
            elif rel.bridge_kind == "CORP_PARENT_MANAGER_BRIDGE" and rel.bridge_entity and rel.bridge_entity.identifier:
                p_mgr_cypher = """
                MATCH (c:Company {tax_code: $borrower_tax_code})
                MERGE (p:Company {tax_code: $parent_tax_code})
                ON CREATE SET p.name = $parent_name, p.created_at = datetime()
                ON MATCH SET p.name = coalesce($parent_name, p.name), p.updated_at = datetime()

                MERGE (pm:Person {cccd: $mgr_cccd})
                ON CREATE SET pm.full_name = $mgr_name, pm.cif = 'CIF-' + substring($mgr_cccd, 0, 6), pm.created_at = datetime()
                ON MATCH SET pm.full_name = coalesce($mgr_name, pm.full_name), pm.updated_at = datetime()

                MERGE (p)-[r1:RELATED_TO {relation_point: "a"}]->(c)
                SET r1.relation_subtype = "Công ty con", r1.relation_tier = "mandatory", r1.effective_from = toString(date())

                MERGE (pm)-[r2:RELATED_TO {relation_point: "b"}]->(p)
                SET r2.position = $manager_pos, r2.relation_subtype = $manager_pos, r2.relation_tier = "mandatory", r2.effective_from = toString(date())
                """
                db_client.execute_query(
                    p_mgr_cypher,
                    {
                        "borrower_tax_code": corp.tax_code,
                        "parent_tax_code": rel.bridge_entity.identifier,
                        "parent_name": rel.bridge_entity.name or "Công ty mẹ",
                        "mgr_cccd": target_id,
                        "mgr_name": rel.name,
                        "manager_pos": rel.bridge_entity.role_or_relationship or "Chủ tịch HĐQT / Lãnh đạo"
                    }
                )

            # 4. Bắc cầu qua Lãnh đạo / Cổ đông lớn tới Người thân (Điểm đ)
            elif rel.bridge_kind == "CORP_LEADER_FAMILY_BRIDGE" and rel.bridge_entity and rel.bridge_entity.identifier:
                lead_fam_cypher = """
                MATCH (c:Company {tax_code: $borrower_tax_code})
                MERGE (lp:Person {cccd: $leader_cccd})
                ON CREATE SET lp.full_name = $leader_name, lp.cif = 'CIF-' + substring($leader_cccd, 0, 6), lp.created_at = datetime()
                ON MATCH SET lp.full_name = coalesce($leader_name, lp.full_name), lp.updated_at = datetime()

                MERGE (rp:Person {cccd: $rel_cccd})
                ON CREATE SET rp.full_name = $rel_name, rp.cif = 'CIF-' + substring($rel_cccd, 0, 6), rp.created_at = datetime()
                ON MATCH SET rp.full_name = coalesce($rel_name, rp.full_name), rp.updated_at = datetime()

                MERGE (lp)-[r_lead:RELATED_TO {relation_point: "b"}]->(c)
                SET r_lead.position = $leader_pos, r_lead.relation_subtype = $leader_pos, r_lead.relation_tier = "mandatory", r_lead.effective_from = toString(date())

                MERGE (lp)-[r_fam:FAMILY]->(rp)
                SET r_fam.relationship = $target_rel, r_fam.relation_point = "d", r_fam.relation_tier = "mandatory", r_fam.effective_from = toString(date())
                """
                db_client.execute_query(
                    lead_fam_cypher,
                    {
                        "borrower_tax_code": corp.tax_code,
                        "leader_cccd": rel.bridge_entity.identifier,
                        "leader_name": rel.bridge_entity.name or "Lãnh đạo DN vay",
                        "leader_pos": rel.bridge_entity.role_or_relationship or "Chủ tịch HĐQT",
                        "rel_cccd": target_id,
                        "rel_name": rel.name,
                        "target_rel": rel.specific_relationship
                    }
                )

            # 5. Quan hệ trực tiếp 0-Hop
            else:
                if rel.entity_type == "ORGANIZATION":
                    rel_org_cypher = """
                    MATCH (c:Company {tax_code: $borrower_tax_code})
                    MERGE (target_c:Company {tax_code: $rel_id})
                    ON CREATE SET target_c.name = $rel_name, target_c.nationality = $nationality, target_c.created_at = datetime()
                    ON MATCH SET target_c.name = coalesce($rel_name, target_c.name), target_c.updated_at = datetime()

                    MERGE (c)-[r:RELATED_TO {relation_point: $rel_point}]->(target_c)
                    SET r.relation_subtype = $rel_label,
                        r.relation_tier = "mandatory",
                        r.ownership_ratio = $ratio_str,
                        r.ownership_pct = $ownership_pct,
                        r.position = $position,
                        r.review_status = "auto_confirmed",
                        r.effective_from = toString(date()),
                        r.updated_at = datetime()
                    """
                    db_client.execute_query(
                        rel_org_cypher,
                        {
                            "borrower_tax_code": corp.tax_code,
                            "rel_id": target_id,
                            "rel_name": rel.name,
                            "nationality": rel.nationality or "Việt Nam",
                            "ratio_str": rel.ownership_ratio or "0%",
                            "ownership_pct": ratio_val,
                            "position": rel.position or "N/A",
                            "rel_point": rel.relation_point or "a",
                            "rel_label": rel.specific_relationship
                        }
                    )
                else:
                    rel_person_cypher = """
                    MATCH (c:Company {tax_code: $borrower_tax_code})
                    MERGE (target_p:Person {cccd: $rel_id})
                    ON CREATE SET target_p.full_name = $rel_name, target_p.nationality = $nationality, target_p.cif = 'CIF-' + substring($rel_id, 0, 6), target_p.created_at = datetime()
                    ON MATCH SET target_p.full_name = coalesce($rel_name, target_p.full_name), target_p.updated_at = datetime()

                    MERGE (target_p)-[r:RELATED_TO {relation_point: $rel_point}]->(c)
                    SET r.relation_subtype = $rel_label,
                        r.relation_tier = "mandatory",
                        r.ownership_ratio = $ratio_str,
                        r.ownership_pct = $ownership_pct,
                        r.position = $position,
                        r.review_status = "auto_confirmed",
                        r.effective_from = toString(date()),
                        r.updated_at = datetime()
                    """
                    db_client.execute_query(
                        rel_person_cypher,
                        {
                            "borrower_tax_code": corp.tax_code,
                            "rel_id": target_id,
                            "rel_name": rel.name,
                            "nationality": rel.nationality or "Việt Nam",
                            "ratio_str": rel.ownership_ratio or "0%",
                            "ownership_pct": ratio_val,
                            "position": rel.position or "N/A",
                            "rel_point": rel.relation_point or "b",
                            "rel_label": rel.specific_relationship
                        }
                    )

    return {
        "status": "DRAFT_SAVED_SUCCESSFULLY",
        "application_id": payload.application_id,
        "loan_id": payload.loan_id,
        "message": f"Toàn bộ thực thể (gốc, trung gian & đích) đã được Upsert vào Master DB. Khoản vay {payload.loan_id} đã lưu Sandbox."
    }

# =============================================================
# 4. CHI TIẾT HỒ SƠ & PHÂN TÍCH RULE ENGINE (ĐIỂM G & ĐIỀU 136)
# =============================================================
@router.get("/draft-applications")
def list_draft_applications(current_user: Any = Depends(get_current_user)):
    query = """
    MATCH (app:DraftApplication)
    RETURN 
        app.app_code AS app_code,
        app.loan_id AS loan_id,
        app.customer_type AS customer_type,
        app.borrower_name AS borrower_name,
        app.identifier AS identifier,
        app.loan_amount AS loan_amount,
        app.purpose AS purpose,
        app.term_months AS term_months,
        app.status AS status,
        app.officer AS officer,
        toString(app.created_at) AS created_at
    ORDER BY app.created_at DESC
    """
    results = db_client.execute_query(query)
    return {"applications": results}

@router.get("/draft-applications/{app_code}")
def get_draft_application_detail(
    app_code: str,
    current_user: Any = Depends(get_current_user)
):
    query = """
    MATCH (app:DraftApplication {app_code: $app_code})
    OPTIONAL MATCH (app)<-[:DRAFT_APPLIED_FOR]-(borrower)
    OPTIONAL MATCH (app)-[:DRAFT_PROPOSES_LOAN]->(dl:DraftLoan)
    RETURN 
        app,
        labels(borrower) AS borrower_labels,
        properties(borrower) AS borrower_props,
        properties(dl) AS loan_props
    """
    result = db_client.execute_query(query, {"app_code": app_code})
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ.")

    borrower_id = result[0]["app"].get("identifier")
    customer_type = result[0]["app"].get("customer_type", "INDIVIDUAL")
    loan_amount = float(result[0]["app"].get("loan_amount", 0.0))

    # 1. Truy vấn các Cạnh Xanh (mandatory 1..2 hops) trong Master DB
    if customer_type == "INDIVIDUAL":
        rel_query = """
        MATCH (p:Person {cccd: $identifier})-[r1*1..2]-(m)
        WITH DISTINCT last(r1) AS r, startNode(last(r1)) AS s, endNode(last(r1)) AS t
        RETURN 
            type(r) AS relation_type,
            properties(r) AS relation_props,
            labels(s) AS source_labels,
            properties(s) AS source_props,
            labels(t) AS target_labels,
            properties(t) AS target_props
        """
    else:
        rel_query = """
        MATCH (c:Company {tax_code: $identifier})-[r1*1..2]-(m)
        WITH DISTINCT last(r1) AS r, startNode(last(r1)) AS s, endNode(last(r1)) AS t
        RETURN 
            type(r) AS relation_type,
            properties(r) AS relation_props,
            labels(s) AS source_labels,
            properties(s) AS source_props,
            labels(t) AS target_labels,
            properties(t) AS target_props
        """
    direct_relationships = db_client.execute_query(rel_query, {"identifier": borrower_id})

    # 2. Chạy Rule Engine phát hiện Cạnh Vàng (risk_based - Điểm g)
    risk_based_flags = GraphRuleEngine.detect_risk_based_relationships(borrower_id, customer_type)

    # 3. Chạy Exposure Engine tính toán giới hạn Điều 136
    exposure_analytics = GraphRuleEngine.compute_connected_group_and_exposure(
        borrower_id, customer_type, loan_amount
    )

    return {
        "application": result[0]["app"],
        "borrower": result[0]["borrower_props"],
        "borrower_type": result[0]["borrower_labels"],
        "loan": result[0]["loan_props"],
        "relationships": direct_relationships,
        "risk_based_flags": risk_based_flags,
        "exposure_analytics": exposure_analytics
    }

# =============================================================
# 5. REVIEW CẠNH VÀNG & PHÊ DUYỆT ĐIỀU 136
# =============================================================
@router.post("/draft-applications/{app_code}/review-relationship")
def review_relationship(
    app_code: str,
    payload: ReviewRelationshipRequest,
    current_user: Any = Depends(get_current_user)
):
    officer_name = getattr(current_user, "username", None) or "officer"
    
    if payload.review_status == "confirmed_related":
        confirm_cypher = """
        MATCH (s), (t)
        WHERE (s.cccd = $id1 OR s.tax_code = $id1) AND (t.cccd = $id2 OR t.tax_code = $id2)
        MERGE (s)-[r:RELATED_TO {relation_point: 'g'}]->(t)
        SET r.relation_subtype = 'Quan hệ tiềm ẩn rủi ro (Điểm g)',
            r.relation_tier = 'risk_based',
            r.review_status = 'confirmed_related',
            r.reviewed_by = $officer,
            r.reviewed_at = datetime(),
            r.effective_from = toString(date()),
            r.updated_at = datetime()
        RETURN r
        """
        db_client.execute_query(
            confirm_cypher,
            {"id1": payload.entity_id_1, "id2": payload.entity_id_2, "officer": officer_name}
        )
    else:
        dismiss_cypher = """
        MATCH (s), (t)
        WHERE (s.cccd = $id1 OR s.tax_code = $id1) AND (t.cccd = $id2 OR t.tax_code = $id2)
        MERGE (s)-[r:RELATED_TO {relation_point: 'g'}]->(t)
        SET r.relation_subtype = 'Bác bỏ quan hệ Điểm g',
            r.relation_tier = 'risk_based',
            r.review_status = 'dismissed',
            r.review_note = $note,
            r.reviewed_by = $officer,
            r.reviewed_at = datetime(),
            r.updated_at = datetime()
        RETURN r
        """
        db_client.execute_query(
            dismiss_cypher,
            {"id1": payload.entity_id_1, "id2": payload.entity_id_2, "note": payload.review_note, "officer": officer_name}
        )

    return {
        "status": "RELATIONSHIP_REVIEWED",
        "review_status": payload.review_status,
        "message": f"Đã cập nhật trạng thái quan hệ thành '{payload.review_status}' thành công."
    }

@router.post("/draft-applications/{app_code}/decision")
def make_application_decision(
    app_code: str,
    payload: ApplicationDecisionRequest,
    current_user: Any = Depends(get_current_user)
):
    update_query = """
    MATCH (app:DraftApplication {app_code: $app_code})
    SET app.status = $decision,
        app.decision_note = $note,
        app.decided_at = datetime()
    RETURN app
    """
    db_client.execute_query(
        update_query,
        {"app_code": app_code, "decision": payload.decision, "note": payload.note}
    )

    synced_msg = ""
    if payload.decision == "APPROVED" and payload.sync_to_master:
        sync_cypher = """
        MATCH (app:DraftApplication {app_code: $app_code})
        MERGE (b:Bank {name: "DVBank"})
        MERGE (l:Loan {loan_id: app.loan_id})
        SET l.amount = app.loan_amount,
            l.balance = app.loan_amount,
            l.purpose = app.purpose,
            l.term_months = app.term_months,
            l.repayment_source = app.repayment_source,
            l.status = "ACTIVE",
            l.start_date = toString(date()),
            l.created_at = datetime()
        MERGE (l)-[:FROM_BANK]->(b)

        WITH app, l
        FOREACH (_ IN CASE WHEN app.customer_type = "INDIVIDUAL" THEN [1] ELSE [] END |
            MERGE (p:Person {cccd: app.identifier})
            MERGE (p)-[:BORROWED {role: "PRIMARY_BORROWER"}]->(l)
        )

        WITH app, l
        FOREACH (_ IN CASE WHEN app.customer_type = "ENTERPRISE" THEN [1] ELSE [] END |
            MERGE (c:Company {tax_code: app.identifier})
            MERGE (c)-[:BORROWED {role: "PRIMARY_BORROWER"}]->(l)
        )
        """
        db_client.execute_query(sync_cypher, {"app_code": app_code})
        synced_msg = " và Khoản vay đã được kích hoạt ACTIVE trong Master Database"

    return {
        "status": "DECISION_RECORDED",
        "decision": payload.decision,
        "message": f"Hồ sơ {app_code} đã được chuyển sang trạng thái {payload.decision}{synced_msg}."
    }