from datetime import datetime
from typing import List, Dict, Any
from app.db.neo4j_client import db_client

class GraphRuleEngine:
    """
    Engine phân tích mẫu hình đồ thị (Pattern Matching) phát hiện Cạnh Vàng Điểm g
    và tính toán trần hạn mức tín dụng theo Điều 136 Luật Các TCTD.
    """
    BANK_EQUITY_CAPITAL = 10_000_000_000_000.0  # Vốn tự có DVBank: 10.000 Tỷ VND
    SINGLE_BORROWER_LIMIT_RATIO = 0.14          # Trần đơn lẻ: 14%
    RELATED_GROUP_LIMIT_RATIO = 0.23            # Trần nhóm liên quan: 23%

    @classmethod
    def detect_risk_based_relationships(cls, identifier: str, customer_type: str) -> List[Dict[str, Any]]:
        """
        Quét Master DB để phát hiện các mẫu hình rủi ro Điểm g (Cạnh Vàng - risk_based)
        theo Bảng quy tắc 7.1.B trong tài liệu quy chuẩn.
        """
        flagged_edges = []

        if customer_type == "ENTERPRISE":
            # -----------------------------------------------------------------
            # MẪU HÌNH 11: Hai công ty có Lãnh đạo / Cổ đông lớn là Vợ/Chồng hoặc Anh/Em
            # -----------------------------------------------------------------
            query_rule_11 = """
            MATCH (c1:Company {tax_code: $tax_code})<-[r1:RELATED_TO]-(p1:Person)-[rf:FAMILY]-(p2:Person)-[r2:RELATED_TO]->(c2:Company)
            WHERE c1 <> c2 
              AND r1.relation_point IN ['b', 'c'] 
              AND r2.relation_point IN ['b', 'c']
            RETURN 
                c1.tax_code AS c1_id, c1.name AS c1_name,
                c2.tax_code AS c2_id, c2.name AS c2_name,
                p1.full_name AS p1_name, p1.cccd AS p1_cccd,
                p2.full_name AS p2_name, p2.cccd AS p2_cccd,
                rf.relationship AS family_rel,
                r1.relation_subtype AS r1_role,
                r2.relation_subtype AS r2_role
            """
            res_11 = db_client.execute_query(query_rule_11, {"tax_code": identifier})
            for row in res_11:
                flagged_edges.append({
                    "rule_id": "RULE_11",
                    "rule_name": "Sở hữu / Quản lý chéo qua quan hệ gia đình (Điểm g)",
                    "relation_point": "g",
                    "relation_tier": "risk_based",
                    "source_id": row["c1_id"],
                    "source_name": row["c1_name"],
                    "source_type": "Company",
                    "target_id": row["c2_id"],
                    "target_name": row["c2_name"],
                    "target_type": "Company",
                    "relation_subtype": f"Liên kết qua {row['p1_name']} ({row['family_rel']}) {row['p2_name']}",
                    "review_status": "pending_review",
                    "reason_summary": f"{row['c1_name']} ({row['p1_name']} - {row['r1_role']}) có quan hệ gia đình '{row['family_rel']}' với {row['p2_name']} ({row['r2_role']} tại {row['c2_name']})."
                })

            # -----------------------------------------------------------------
            # MẪU HÌNH 12: Hai công ty chung 1 Tổng giám đốc / Người quản lý điều hành thuê (0% vốn)
            # -----------------------------------------------------------------
            query_rule_12 = """
            MATCH (c1:Company {tax_code: $tax_code})<-[r1:RELATED_TO {relation_point: 'b'}]-(p:Person)-[r2:RELATED_TO {relation_point: 'b'}]->(c2:Company)
            WHERE c1 <> c2 AND coalesce(r1.ownership_pct, 0) = 0 AND coalesce(r2.ownership_pct, 0) = 0
            RETURN 
                c1.tax_code AS c1_id, c1.name AS c1_name,
                c2.tax_code AS c2_id, c2.name AS c2_name,
                p.full_name AS manager_name, p.cccd AS manager_cccd,
                r1.position AS r1_pos, r2.position AS r2_pos
            """
            res_12 = db_client.execute_query(query_rule_12, {"tax_code": identifier})
            for row in res_12:
                flagged_edges.append({
                    "rule_id": "RULE_12",
                    "rule_name": "Chung Người quản lý điều hành / Giám đốc ngồi nhiều ghế (Điểm g)",
                    "relation_point": "g",
                    "relation_tier": "risk_based",
                    "source_id": row["c1_id"],
                    "source_name": row["c1_name"],
                    "source_type": "Company",
                    "target_id": row["c2_id"],
                    "target_name": row["c2_name"],
                    "target_type": "Company",
                    "relation_subtype": f"Chung Lãnh đạo điều hành: {row['manager_name']}",
                    "review_status": "pending_review",
                    "reason_summary": f"Ông/Bà {row['manager_name']} đồng thời giữ chức vụ quản lý tại {row['c1_name']} ({row['r1_pos']}) và {row['c2_name']} ({row['r2_pos']})."
                })

            # -----------------------------------------------------------------
            # MẪU HÌNH 14: Trùng địa chỉ trụ sở kinh doanh
            # -----------------------------------------------------------------
            query_rule_14 = """
            MATCH (c1:Company {tax_code: $tax_code}), (c2:Company)
            WHERE c1 <> c2 
              AND c1.address IS NOT NULL 
              AND c1.address = c2.address 
              AND c1.address <> 'NOT_FOUND' 
              AND c1.address <> ''
            RETURN 
                c1.tax_code AS c1_id, c1.name AS c1_name,
                c2.tax_code AS c2_id, c2.name AS c2_name,
                c1.address AS shared_address
            """
            res_14 = db_client.execute_query(query_rule_14, {"tax_code": identifier})
            for row in res_14:
                flagged_edges.append({
                    "rule_id": "RULE_14",
                    "rule_name": "Trùng địa chỉ trụ sở kinh doanh (Điểm g)",
                    "relation_point": "g",
                    "relation_tier": "risk_based",
                    "source_id": row["c1_id"],
                    "source_name": row["c1_name"],
                    "source_type": "Company",
                    "target_id": row["c2_id"],
                    "target_name": row["c2_name"],
                    "target_type": "Company",
                    "relation_subtype": "Dùng chung trụ sở",
                    "review_status": "pending_review",
                    "reason_summary": f"Hai doanh nghiệp đăng ký cùng địa chỉ: {row['shared_address']}."
                })

            # -----------------------------------------------------------------
            # MẪU HÌNH 15: Cổ đông sở hữu < 5% nhưng nghi vấn chi phối
            # -----------------------------------------------------------------
            query_rule_15 = """
            MATCH (c:Company {tax_code: $tax_code})<-[r:RELATED_TO]-(p:Person)
            WHERE r.ownership_pct > 0 AND r.ownership_pct < 5
            RETURN 
                c.tax_code AS c_id, c.name AS c_name,
                p.cccd AS p_id, p.full_name AS p_name,
                r.ownership_pct AS pct
            """
            res_15 = db_client.execute_query(query_rule_15, {"tax_code": identifier})
            for row in res_15:
                flagged_edges.append({
                    "rule_id": "RULE_15",
                    "rule_name": "Sở hữu < 5% nghi vấn đứng tên hộ (Điểm g)",
                    "relation_point": "g",
                    "relation_tier": "risk_based",
                    "source_id": row["p_id"],
                    "source_name": row["p_name"],
                    "source_type": "Person",
                    "target_id": row["c_id"],
                    "target_name": row["c_name"],
                    "target_type": "Company",
                    "relation_subtype": f"Cổ đông nắm {row['pct']}% vốn",
                    "review_status": "pending_review",
                    "reason_summary": f"Cá nhân nắm giữ {row['pct']}% vốn tại {row['c_name']} (< ngưỡng 5%), cần thẩm định quyền chi phối thực tế."
                })

        return flagged_edges

    @classmethod
    def compute_connected_group_and_exposure(
        cls, 
        identifier: str, 
        customer_type: str, 
        proposed_loan_amount: float
    ) -> Dict[str, Any]:
        """
        Tính toán tổng dư nợ nhóm liên quan và đối soát giới hạn tín dụng Điều 136.
        """
        if customer_type == "INDIVIDUAL":
            query_members = """
            MATCH (p:Person {cccd: $id})-[r1*0..2]-(m)
            WHERE all(rel in r1 WHERE rel.relation_tier = 'mandatory' OR rel.review_status = 'confirmed_related')
            WITH DISTINCT m
            OPTIONAL MATCH (m)-[:BORROWED]->(l:Loan {status: 'ACTIVE'})
            RETURN 
                coalesce(m.cccd, m.tax_code) AS member_id,
                coalesce(m.full_name, m.name) AS member_name,
                labels(m)[0] AS member_type,
                coalesce(sum(l.balance), 0.0) AS active_loan_balance
            """
        else:
            query_members = """
            MATCH (c:Company {tax_code: $id})-[r1*0..2]-(m)
            WHERE all(rel in r1 WHERE rel.relation_tier = 'mandatory' OR rel.review_status = 'confirmed_related')
            WITH DISTINCT m
            OPTIONAL MATCH (m)-[:BORROWED]->(l:Loan {status: 'ACTIVE'})
            RETURN 
                coalesce(m.cccd, m.tax_code) AS member_id,
                coalesce(m.full_name, m.name) AS member_name,
                labels(m)[0] AS member_type,
                coalesce(sum(l.balance), 0.0) AS active_loan_balance
            """

        members_data = db_client.execute_query(query_members, {"id": identifier})
        existing_group_debt = sum(row["active_loan_balance"] for row in members_data)

        primary_member = next((m for m in members_data if m["member_id"] == identifier), None)
        existing_single_debt = primary_member["active_loan_balance"] if primary_member else 0.0

        total_single_exposure = existing_single_debt + proposed_loan_amount
        total_group_exposure = existing_group_debt + proposed_loan_amount

        single_limit_amount = cls.BANK_EQUITY_CAPITAL * cls.SINGLE_BORROWER_LIMIT_RATIO
        group_limit_amount = cls.BANK_EQUITY_CAPITAL * cls.RELATED_GROUP_LIMIT_RATIO

        single_ratio_actual = (total_single_exposure / cls.BANK_EQUITY_CAPITAL) * 100
        group_ratio_actual = (total_group_exposure / cls.BANK_EQUITY_CAPITAL) * 100

        is_single_exceeded = total_single_exposure > single_limit_amount
        is_group_exceeded = total_group_exposure > group_limit_amount

        compliance_status = "COMPLIANT"
        if is_single_exceeded or is_group_exceeded:
            compliance_status = "EXCEEDED_LIMIT"
        elif group_ratio_actual >= 18.0:
            compliance_status = "NEAR_LIMIT_WARNING"

        return {
            "bank_equity_capital": cls.BANK_EQUITY_CAPITAL,
            "proposed_loan_amount": proposed_loan_amount,
            "single_borrower": {
                "existing_debt": existing_single_debt,
                "total_exposure": total_single_exposure,
                "limit_amount": single_limit_amount,
                "limit_ratio_allowed_pct": cls.SINGLE_BORROWER_LIMIT_RATIO * 100,
                "actual_ratio_pct": round(single_ratio_actual, 2),
                "is_exceeded": is_single_exceeded
            },
            "connected_group": {
                "member_count": len(members_data),
                "members": members_data,
                "existing_group_debt": existing_group_debt,
                "total_group_exposure": total_group_exposure,
                "limit_amount": group_limit_amount,
                "limit_ratio_allowed_pct": cls.RELATED_GROUP_LIMIT_RATIO * 100,
                "actual_ratio_pct": round(group_ratio_actual, 2),
                "is_exceeded": is_group_exceeded
            },
            "compliance_status": compliance_status
        }