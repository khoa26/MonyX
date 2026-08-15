import os
import re
import shutil
import uuid
from typing import List, Optional, Any
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from app.services.extractor import DocumentExtractionService
from app.api.deps import get_current_user
from app.db.neo4j_client import db_client

router = APIRouter()

# =============================================================================
# SCHEMAS CÁ NHÂN (INDIVIDUAL DTOs)
# =============================================================================
class BorrowerProfileDTO(BaseModel):
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

class LoanDetailsDTO(BaseModel):
    purpose: Optional[str] = "Vay bổ sung vốn kinh doanh"
    loan_amount: Optional[str] = "0"
    term_months: Optional[str] = "12"
    business_name: Optional[str] = "NOT_FOUND"
    business_address: Optional[str] = "NOT_FOUND"

class RelatedEntityDTO(BaseModel):
    id: Optional[str] = None
    entity_type: Optional[str] = "PERSON"
    full_name: str
    identifier: Optional[str] = "NOT_FOUND"
    relationship_type: str
    custom_relationship: Optional[str] = None
    ownership_ratio: Optional[str] = "0%"

class SaveIndividualApplicationRequest(BaseModel):
    application_id: str
    borrower_profile: BorrowerProfileDTO
    loan_details: LoanDetailsDTO
    related_group: List[RelatedEntityDTO]

# =============================================================================
# SCHEMAS DOANH NGHIỆP (ENTERPRISE DTOs)
# =============================================================================
class EnterpriseProfileDTO(BaseModel):
    company_name: str
    short_name: Optional[str] = "NOT_FOUND"
    tax_code: str
    charter_capital: Optional[str] = "NOT_FOUND"
    headquarters_address: Optional[str] = "NOT_FOUND"
    business_sector: Optional[str] = "NOT_FOUND"
    
class EnterpriseLoanDTO(BaseModel):
    loan_amount: Optional[str] = "0"
    purpose: Optional[str] = "Vay vốn lưu động / sản xuất kinh doanh"
    term_months: Optional[str] = "12"
    repayment_source: Optional[str] = "Doanh thu từ hoạt động sản xuất kinh doanh"

class EnterpriseRepDTO(BaseModel):
    full_name: str
    cccd_id: str
    issue_date: Optional[str] = "NOT_FOUND"
    issue_place: Optional[str] = "NOT_FOUND"
    position: Optional[str] = "Người đại diện theo pháp luật / Giám đốc"
    workplace: Optional[str] = "NOT_FOUND"
    current_address: Optional[str] = "NOT_FOUND"
    phone: Optional[str] = "NOT_FOUND"
    email: Optional[str] = "NOT_FOUND"

class EnterpriseRelatedEntityDTO(BaseModel):
    id: Optional[str] = None
    entity_type: str = "ORGANIZATION"
    name: str
    identifier: Optional[str] = "NOT_FOUND"
    nationality: Optional[str] = "Việt Nam"
    issue_date: Optional[str] = "NOT_FOUND"
    issue_place: Optional[str] = "NOT_FOUND"
    position: Optional[str] = "NOT_FOUND"
    relationship_group: str
    specific_relationship: str
    custom_relationship: Optional[str] = None
    ownership_ratio: Optional[str] = "0%"

class SaveEnterpriseApplicationRequest(BaseModel):
    application_id: str
    enterprise_profile: EnterpriseProfileDTO
    loan_details: EnterpriseLoanDTO
    representative: EnterpriseRepDTO
    related_group: List[EnterpriseRelatedEntityDTO]

# =============================================================================
# ENDPOINTS LUỒNG CÁ NHÂN
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

    loan_path = os.path.join(upload_dir, "loan_app.pdf")
    cccd_path = os.path.join(upload_dir, "cccd.pdf")
    related_path = os.path.join(upload_dir, "related.pdf")

    officer_username = getattr(current_user, "username", None) or (
        current_user.get("username") if isinstance(current_user, dict) else "officer"
    )

    try:
        with open(loan_path, "wb") as f:
            shutil.copyfileobj(loan_application.file, f)
        with open(cccd_path, "wb") as f:
            shutil.copyfileobj(national_id.file, f)
        with open(related_path, "wb") as f:
            shutil.copyfileobj(related_declaration.file, f)

        cccd_info = DocumentExtractionService.extract_from_cccd(cccd_path)
        loan_info = DocumentExtractionService.extract_from_loan_app(loan_path)
        related_entities = DocumentExtractionService.extract_from_related_declaration(related_path)

        warnings = []
        if (
            cccd_info.get("cccd_id") != "NOT_FOUND" 
            and loan_info.get("national_id") != "NOT_FOUND" 
            and cccd_info.get("cccd_id") != loan_info.get("national_id")
        ):
            warnings.append(
                f"Số CCCD trên ảnh ({cccd_info['cccd_id']}) khác với số kê khai trên đơn ({loan_info['national_id']})."
            )

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
                "phone": loan_info.get("phone_number", "NOT_FOUND"),
                "email": loan_info.get("email", "NOT_FOUND"),
            },
            "loan_details": {
                "purpose": loan_info.get("purpose", "Vay bổ sung vốn kinh doanh"),
                "loan_amount": loan_info.get("loan_amount_proposed", "500000000"),
                "term_months": loan_info.get("loan_term_months", "36"),
                "business_name": loan_info.get("business_name", "NOT_FOUND"),
                "business_address": loan_info.get("business_address", "NOT_FOUND")
            },
            "related_group": related_entities,
            "validation_warnings": warnings
        }
    finally:
        shutil.rmtree(upload_dir, ignore_errors=True)

@router.post("/save-individual")
def save_individual_application(
    payload: SaveIndividualApplicationRequest,
    current_user: Any = Depends(get_current_user)
):
    officer_username = getattr(current_user, "username", None) or (
        current_user.get("username") if isinstance(current_user, dict) else "officer"
    )

    borrower = payload.borrower_profile
    loan = payload.loan_details
    app_id = payload.application_id

    raw_amount = re.sub(r"[^\d]", "", str(loan.loan_amount or "0"))
    amount_numeric = float(raw_amount) if raw_amount else 0.0

    base_cypher = """
    MERGE (b:Bank {name: "DVBank"})
    
    MERGE (p:Person {cccd: $borrower_cccd})
    SET p.full_name = $borrower_name,
        p.dob = $borrower_dob,
        p.gender = $borrower_gender,
        p.address = $borrower_address,
        p.phone = $borrower_phone,
        p.email = $borrower_email,
        p.cif = coalesce(p.cif, 'CIF-' + substring($borrower_cccd, 0, 6)),
        p.updated_at = datetime()

    MERGE (app:Application {app_code: $app_code})
    SET app.status = "VERIFIED_READY",
        app.officer = $officer,
        app.entity_type = "INDIVIDUAL",
        app.created_at = datetime()

    MERGE (l:Loan {loan_id: "LOAN-" + $app_code})
    SET l.amount = $loan_amount,
        l.purpose = $loan_purpose,
        l.term_months = $term_months,
        l.status = "UNDERWRITING",
        l.created_at = datetime()

    MERGE (p)-[:APPLIED_FOR]->(app)
    MERGE (app)-[:PROPOSES_LOAN]->(l)
    MERGE (l)-[:FROM_BANK]->(b)
    """

    db_client.execute_query(
        base_cypher,
        {
            "borrower_cccd": borrower.cccd_id,
            "borrower_name": borrower.full_name,
            "borrower_dob": borrower.dob,
            "borrower_gender": borrower.gender,
            "borrower_address": borrower.place_of_residence,
            "borrower_phone": borrower.phone,
            "borrower_email": borrower.email,
            "app_code": app_id,
            "officer": officer_username,
            "loan_amount": amount_numeric,
            "loan_purpose": loan.purpose,
            "term_months": int(loan.term_months) if str(loan.term_months).isdigit() else 12,
        }
    )

    for rel in payload.related_group:
        rel_identifier = rel.identifier if rel.identifier and rel.identifier != "NOT_FOUND" else f"UNKNOWN-{uuid.uuid4().hex[:6]}"
        rel_name = rel.full_name
        rel_label = rel.custom_relationship if rel.relationship_type == "Tùy chỉnh khác" else rel.relationship_type

        if rel.entity_type == "COMPANY" or rel.relationship_type == "Doanh nghiệp sở hữu / Cổ đông":
            rel_cypher = """
            MATCH (p:Person {cccd: $borrower_cccd})
            MERGE (c:Company {tax_code: $tax_code})
            ON CREATE SET c.name = $comp_name, c.created_at = datetime()
            MERGE (p)-[r:OWNERSHIP]->(c)
            SET r.ratio = $ratio,
                r.label = "Cổ đông / Sở hữu",
                r.updated_at = datetime()
            """
            db_client.execute_query(
                rel_cypher,
                {
                    "borrower_cccd": borrower.cccd_id,
                    "tax_code": rel_identifier,
                    "comp_name": rel_name,
                    "ratio": rel.ownership_ratio or "0%"
                }
            )
        else:
            rel_cypher = """
            MATCH (p:Person {cccd: $borrower_cccd})
            MERGE (rp:Person {cccd: $rel_cccd})
            ON CREATE SET rp.full_name = $rel_name, rp.cif = 'CIF-' + substring($rel_cccd, 0, 6)
            MERGE (p)-[r:FAMILY]->(rp)
            SET r.relationship = $rel_label,
                r.updated_at = datetime()
            """
            db_client.execute_query(
                rel_cypher,
                {
                    "borrower_cccd": borrower.cccd_id,
                    "rel_cccd": rel_identifier,
                    "rel_name": rel_name,
                    "rel_label": rel_label
                }
            )

    return {
        "status": "SAVED_TO_GRAPH_SUCCESSFULLY",
        "application_id": app_id,
        "borrower_cccd": borrower.cccd_id,
        "message": f"Hồ sơ cá nhân {borrower.full_name} (CCCD: {borrower.cccd_id}) đã nạp vào Đồ thị DVBank thành công."
    }

# =============================================================
# ENDPOINTS LUỒNG DOANH NGHIỆP
# =============================================================
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

    officer_username = getattr(current_user, "username", None) or (
        current_user.get("username") if isinstance(current_user, dict) else "officer"
    )

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
                "charter_capital": "NOT_FOUND",
                "headquarters_address": "NOT_FOUND",
                "business_sector": "NOT_FOUND"
            },
            "loan_details": {
                "loan_amount": "5000000000",
                "purpose": "Vay bổ sung vốn lưu động phục vụ kinh doanh",
                "term_months": "12",
                "repayment_source": "Doanh thu hoạt động kinh doanh"
            },
            "representative": {
                "full_name": rep_info.get("full_name", "NOT_FOUND"),
                "cccd_id": rep_info.get("cccd_id", "NOT_FOUND"),
                "issue_date": "NOT_FOUND",
                "issue_place": "NOT_FOUND",
                "position": "Người đại diện theo pháp luật / Tổng Giám đốc",
                "workplace": "NOT_FOUND",
                "current_address": rep_info.get("place_of_residence", "NOT_FOUND"),
                "phone": "NOT_FOUND",
                "email": "NOT_FOUND"
            },
            "related_group": []
        }
    finally:
        shutil.rmtree(upload_dir, ignore_errors=True)

@router.post("/save-enterprise")
def save_enterprise_application(
    payload: SaveEnterpriseApplicationRequest,
    current_user: Any = Depends(get_current_user)
):
    officer_username = getattr(current_user, "username", None) or (
        current_user.get("username") if isinstance(current_user, dict) else "officer"
    )

    corp = payload.enterprise_profile
    rep = payload.representative
    loan = payload.loan_details
    app_id = payload.application_id

    raw_amount = re.sub(r"[^\d]", "", str(loan.loan_amount or "0"))
    amount_numeric = float(raw_amount) if raw_amount else 0.0

    corp_cypher = """
    MERGE (b:Bank {name: "DVBank"})

    MERGE (c:Company {tax_code: $tax_code})
    SET c.name = $company_name,
        c.short_name = $short_name,
        c.charter_capital = $charter_capital,
        c.address = $headquarters_address,
        c.business_sector = $business_sector,
        c.updated_at = datetime()

    MERGE (p:Person {cccd: $rep_cccd})
    SET p.full_name = $rep_name,
        p.phone = $rep_phone,
        p.email = $rep_email,
        p.address = $rep_address,
        p.updated_at = datetime()

    MERGE (p)-[r_rep:LEGAL_REPRESENTATIVE]->(c)
    SET r_rep.position = $rep_position,
        r_rep.workplace = $rep_workplace,
        r_rep.updated_at = datetime()

    MERGE (app:Application {app_code: $app_code})
    SET app.status = "VERIFIED_READY",
        app.officer = $officer,
        app.entity_type = "ENTERPRISE",
        app.created_at = datetime()

    MERGE (l:Loan {loan_id: "LOAN-" + $app_code})
    SET l.amount = $loan_amount,
        l.purpose = $loan_purpose,
        l.term_months = $term_months,
        l.repayment_source = $repayment_source,
        l.status = "UNDERWRITING",
        l.created_at = datetime()

    MERGE (c)-[:APPLIED_FOR]->(app)
    MERGE (app)-[:PROPOSES_LOAN]->(l)
    MERGE (l)-[:FROM_BANK]->(b)
    """

    db_client.execute_query(
        corp_cypher,
        {
            "tax_code": corp.tax_code,
            "company_name": corp.company_name,
            "short_name": corp.short_name,
            "charter_capital": corp.charter_capital,
            "headquarters_address": corp.headquarters_address,
            "business_sector": corp.business_sector,
            "rep_cccd": rep.cccd_id,
            "rep_name": rep.full_name,
            "rep_phone": rep.phone,
            "rep_email": rep.email,
            "rep_address": rep.current_address,
            "rep_position": rep.position,
            "rep_workplace": rep.workplace,
            "app_code": app_id,
            "officer": officer_username,
            "loan_amount": amount_numeric,
            "loan_purpose": loan.purpose,
            "term_months": int(loan.term_months) if str(loan.term_months).isdigit() else 12,
            "repayment_source": loan.repayment_source,
        }
    )

    for rel in payload.related_group:
        rel_id = rel.identifier if rel.identifier and rel.identifier != "NOT_FOUND" else f"UNKNOWN-{uuid.uuid4().hex[:6]}"
        rel_label = rel.custom_relationship if rel.specific_relationship == "Tùy chỉnh khác" else rel.specific_relationship

        if rel.entity_type == "ORGANIZATION":
            rel_org_cypher = """
            MATCH (c:Company {tax_code: $borrower_tax_code})
            MERGE (target_c:Company {tax_code: $target_tax_code})
            ON CREATE SET target_c.name = $target_name, target_c.nationality = $nationality, target_c.created_at = datetime()
            MERGE (c)-[r:RELATED_ORGANIZATION]->(target_c)
            SET r.relationship_group = $rel_group,
                r.specific_relationship = $rel_label,
                r.ownership_ratio = $ratio,
                r.position = $position,
                r.updated_at = datetime()
            """
            db_client.execute_query(
                rel_org_cypher,
                {
                    "borrower_tax_code": corp.tax_code,
                    "target_tax_code": rel_id,
                    "target_name": rel.name,
                    "nationality": rel.nationality,
                    "rel_group": rel.relationship_group,
                    "rel_label": rel_label,
                    "ratio": rel.ownership_ratio or "0%",
                    "position": rel.position or "N/A"
                }
            )
        else:
            rel_person_cypher = """
            MATCH (c:Company {tax_code: $borrower_tax_code})
            MERGE (target_p:Person {cccd: $target_cccd})
            ON CREATE SET target_p.full_name = $target_name, target_p.nationality = $nationality, target_p.cif = 'CIF-' + substring($target_cccd, 0, 6)
            MERGE (target_p)-[r:RELATED_PERSON]->(c)
            SET r.relationship_group = $rel_group,
                r.specific_relationship = $rel_label,
                r.ownership_ratio = $ratio,
                r.position = $position,
                r.updated_at = datetime()
            """
            db_client.execute_query(
                rel_person_cypher,
                {
                    "borrower_tax_code": corp.tax_code,
                    "target_cccd": rel_id,
                    "target_name": rel.name,
                    "nationality": rel.nationality,
                    "rel_group": rel.relationship_group,
                    "rel_label": rel_label,
                    "ratio": rel.ownership_ratio or "0%",
                    "position": rel.position or "N/A"
                }
            )

    return {
        "status": "SAVED_ENTERPRISE_TO_GRAPH_SUCCESS",
        "application_id": app_id,
        "tax_code": corp.tax_code,
        "message": f"Hồ sơ doanh nghiệp {corp.company_name} (MSDN: {corp.tax_code}) đã được nạp thành công vào Đồ thị DVBank."
    }