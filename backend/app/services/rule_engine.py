from datetime import datetime
from typing import List, Dict, Any
from app.db.neo4j_client import db_client

class GraphRuleEngine:
    """
    Engine phân tích mẫu hình đồ thị phát hiện Cạnh Vàng Điểm g
    và tính toán trần hạn mức tín dụng theo lộ trình Điều 136 Luật Các TCTD 2024.
    """
    DEFAULT_BANK_EQUITY_CAPITAL = 10_000_000_000_000.0  # 10.000 Tỷ VND

    @classmethod
    def get_statutory_limits(cls, date_str: str = None) -> Dict[str, Any]:
        """
        Tra cứu tỷ lệ trần Điều 136 theo lộ trình thời gian thực.
        """
        if not date_str:
            dt = datetime.now()
        else:
            try:
                dt = datetime.strptime(date_str.split("T")[0], "%Y-%m-%d")
            except Exception:
                dt = datetime.now()

        if dt < datetime(2026, 1, 1):
            return {
                "phase": "Trước ngày 01/01/2026",
                "single_limit_ratio": 0.14,
                "group_limit_ratio": 0.23,
                "year_label": "< 2026",
                "next_phase": "Năm 2026 (13% / 21%)"
            }
        elif dt < datetime(2027, 1, 1):
            return {
                "phase": "Từ 01/01/2026 đến trước 01/01/2027",
                "single_limit_ratio": 0.13,
                "group_limit_ratio": 0.21,
                "year_label": "2026",
                "next_phase": "Năm 2027 (12% / 19%)"
            }
        elif dt < datetime(2028, 1, 1):
            return {
                "phase": "Từ 01/01/2027 đến trước 01/01/2028",
                "single_limit_ratio": 0.12,
                "group_limit_ratio": 0.19,
                "year_label": "2027",
                "next_phase": "Năm 2028 (11% / 17%)"
            }
        elif dt < datetime(2029, 1, 1):
            return {
                "phase": "Từ 01/01/2028 đến trước 01/01/2029",
                "single_limit_ratio": 0.11,
                "group_limit_ratio": 0.17,
                "year_label": "2028",
                "next_phase": "Từ 2029 (10% / 15%)"
            }
        else:
            return {
                "phase": "Từ ngày 01/01/2029 trở đi",
                "single_limit_ratio": 0.10,
                "group_limit_ratio": 0.15,
                "year_label": ">= 2029",
                "next_phase": "Duy trì 10% / 15%"
            }

    @classmethod
    def get_bank_config(cls) -> Dict[str, Any]:
        query = """
        MERGE (b:Bank {name: "DVBank"})
        ON CREATE SET 
            b.full_name = "Ngân hàng Thương mại Cổ phần DVBank",
            b.equity_capital = 10000000000000.0,
            b.charter_capital = 8000000000000.0,
            b.updated_at = datetime()
        RETURN 
            coalesce(b.name, "DVBank") AS name,
            coalesce(b.full_name, "Ngân hàng TMCP DVBank") AS full_name,
            coalesce(b.equity_capital, 10000000000000.0) AS equity_capital,
            coalesce(b.charter_capital, 8000000000000.0) AS charter_capital,
            toString(coalesce(b.updated_at, datetime())) AS updated_at
        """
        res = db_client.execute_query(query)
        if res:
            return res[0]
        return {
            "name": "DVBank",
            "full_name": "Ngân hàng TMCP DVBank",
            "equity_capital": cls.DEFAULT_BANK_EQUITY_CAPITAL,
            "charter_capital": 8_000_000_000_000.0,
            "updated_at": datetime.now().isoformat()
        }

    @classmethod
    def detect_risk_based_relationships(cls, identifier: str, customer_type: str) -> List[Dict[str, Any]]:
        flagged_edges = []

        if customer_type == "ENTERPRISE":
            # QUY TẮC 11: Sở hữu / Quản lý chéo qua quan hệ gia đình (Điểm g)[cite: 5, 6]
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

            # QUY TẮC 12: Chung Giám đốc điều hành thuê (Điểm g)[cite: 5, 6]
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

            # QUY TẮC 14: Trùng địa chỉ trụ sở[cite: 5, 6]
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

            # QUY TẮC 15: Cổ đông < 5% nghi vấn đứng tên hộ[cite: 5, 6]
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
                    "reason_summary": f"Cá nhân nắm giữ {row['pct']}% vốn tại {row['c_name']} (< ngưỡng định lượng 5%)."
                })

        return flagged_edges

    @classmethod
    def compute_connected_group_and_exposure(
        cls, 
        identifier: str, 
        customer_type: str, 
        proposed_loan_amount: float,
        application_date: str = None
    ) -> Dict[str, Any]:
        """
        Tính toán toàn bộ dư nợ đồ thị và phân tích trần hạn mức Điều 136.
        """
        bank_cfg = cls.get_bank_config()
        bank_equity_capital = float(bank_cfg.get("equity_capital", cls.DEFAULT_BANK_EQUITY_CAPITAL))
        
        statutory = cls.get_statutory_limits(application_date)
        single_limit_ratio = statutory["single_limit_ratio"]
        group_limit_ratio = statutory["group_limit_ratio"]

        # Truy xuất danh sách thành viên trong mạng lưới đồ thị 2 tầng (0..2 hops) chuẩn xác
        query_members = """
        MATCH (root) WHERE (root.cccd = $id OR root.tax_code = $id)
        MATCH path = (root)-[r1:FAMILY|RELATED_TO|LEGAL_REPRESENTATIVE*0..2]-(m)
        WHERE (m:Person OR m:Company)
          AND all(rel in r1 WHERE rel.relation_tier = 'mandatory' OR rel.review_status = 'confirmed_related')
        WITH DISTINCT m
        OPTIONAL MATCH (m)-[:BORROWED]->(l:Loan {status: 'ACTIVE'})
        RETURN 
            coalesce(m.cccd, m.tax_code) AS member_id,
            coalesce(m.full_name, m.name) AS member_name,
            labels(m)[0] AS member_type,
            coalesce(sum(l.balance), 0.0) AS active_loan_balance,
            count(l) AS loan_count
        ORDER BY active_loan_balance DESC
        """
        members_data = db_client.execute_query(query_members, {"id": identifier})

        person_idx = 1
        company_idx = 1
        for m in members_data:
            if m["member_type"] == "Person":
                m["code"] = f"P{person_idx:03d}"
                person_idx += 1
            else:
                m["code"] = f"C{company_idx:03d}"
                company_idx += 1

        existing_group_debt = sum(row["active_loan_balance"] for row in members_data)
        primary_member = next((m for m in members_data if m["member_id"] == identifier), None)
        existing_single_debt = primary_member["active_loan_balance"] if primary_member else 0.0

        total_single_exposure = existing_single_debt + proposed_loan_amount
        total_group_exposure = existing_group_debt + proposed_loan_amount

        single_limit_amount = bank_equity_capital * single_limit_ratio
        group_limit_amount = bank_equity_capital * group_limit_ratio

        actual_single_ratio_pct = (total_single_exposure / bank_equity_capital) * 100
        actual_group_ratio_pct = (total_group_exposure / bank_equity_capital) * 100

        is_single_exceeded = total_single_exposure > single_limit_amount
        is_group_exceeded = total_group_exposure > group_limit_amount
        is_exceeded = is_single_exceeded or is_group_exceeded

        # Room khả dụng còn lại
        remaining_single_room = single_limit_amount - total_single_exposure
        remaining_group_room = group_limit_amount - total_group_exposure
        overall_remaining_room = min(remaining_single_room, remaining_group_room)

        single_capacity_before = max(0.0, single_limit_amount - existing_single_debt)
        group_capacity_before = max(0.0, group_limit_amount - existing_group_debt)
        max_allowable_loan_for_applicant = min(single_capacity_before, group_capacity_before)

        # Top dư nợ theo thực thể
        top_exposures = [
            {
                "code": m["code"],
                "name": m["member_name"],
                "type": m["member_type"],
                "balance": m["active_loan_balance"],
                "balance_billion": round(m["active_loan_balance"] / 1e9, 2),
                "is_primary": m["member_id"] == identifier
            }
            for m in members_data if m["active_loan_balance"] > 0
        ]

        # Cảnh báo rủi ro
        risk_alerts = []
        if is_exceeded:
            times = round(total_group_exposure / group_limit_amount, 2)
            risk_alerts.append({
                "level": "CRITICAL",
                "title": f"Vượt hạn mức cấp tín dụng nhóm liên quan: {total_group_exposure/1e9:,.0f} tỷ > {group_limit_amount/1e9:,.0f} tỷ ({statutory['group_limit_ratio']*100:.0f}%)",
                "detail": f"Tổng mức cấp tín dụng vượt {abs(remaining_group_room)/1e9:,.0f} tỷ VNĐ ({times} lần trần luật định)."
            })
        risk_alerts.append({
            "level": "WARNING",
            "title": "Mạng lưới sở hữu chéo & liên kết nhóm phức tạp",
            "detail": f"Phát hiện {len(members_data)} thực thể liên quan trực tiếp và bắc cầu trong đồ thị."
        })
        if top_exposures:
            top3_sum = sum(x["balance"] for x in top_exposures[:3])
            risk_alerts.append({
                "level": "INFO",
                "title": "Dư nợ tập trung cao",
                "detail": f"Top 3 thực thể chiếm {top3_sum/1e9:,.0f} tỷ VNĐ ({top3_sum/existing_group_debt*100:.1f}%) tổng dư nợ nhóm."
            })

        # Phân tích mạng lưới (AI Discovery)
        num_persons = sum(1 for m in members_data if m["member_type"] == "Person")
        num_companies = sum(1 for m in members_data if m["member_type"] == "Company")
        insights = [
            f"Mạng lưới đồ thị gồm {num_persons} cá nhân và {num_companies} pháp nhân có quan hệ pháp lý và điều hành.",
            f"Tổng dư nợ hiện hữu toàn nhóm đạt {existing_group_debt/1e9:,.0f} tỷ VNĐ trước thời điểm thẩm định hồ sơ mới.",
            f"Nếu phê duyệt giải ngân khoản vay đề xuất {proposed_loan_amount/1e9:,.0f} tỷ VNĐ, tổng mức cấp tín dụng toàn nhóm sẽ lên {total_group_exposure/1e9:,.0f} tỷ VNĐ ({actual_group_ratio_pct:.1f}% Vốn tự có)."
        ]

        # Khuyến nghị hành động
        recommended_actions = []
        if is_exceeded:
            recommended_actions.extend([
                "Hạn chế cấp tín dụng mới vượt trần cho nhóm khách hàng liên quan này.",
                f"Đề xuất giảm số tiền vay xuống tối đa {max_allowable_loan_for_applicant/1e9:,.0f} tỷ VNĐ để bảo đảm tỷ lệ an toàn vốn.",
                "Yêu cầu bổ sung tài sản bảo đảm thanh khoản cao / Tăng tỷ lệ ký quỹ.",
                "Báo cáo Hội đồng Quản trị và lập phương án giải trình tuân thủ theo quy định NHNN."
            ])
        else:
            recommended_actions.extend([
                "Khoản vay đủ điều kiện hạn mức an toàn vốn Điều 136.",
                "Tiếp tục thẩm định năng lực tài chính và phương án trả nợ của khách hàng.",
                "Khóa snapshot cấu trúc đồ thị tại thời điểm giải ngân để lưu vết kiểm toán."
            ])

        compliance_status = "EXCEEDED_LIMIT" if is_exceeded else "COMPLIANT"

        return {
            "bank_name": bank_cfg.get("full_name", "DVBank"),
            "bank_equity_capital": bank_equity_capital,
            "statutory_schedule": statutory,
            "proposed_loan_amount": proposed_loan_amount,
            "single_borrower": {
                "existing_debt": existing_single_debt,
                "total_exposure": total_single_exposure,
                "limit_amount": single_limit_amount,
                "limit_ratio_allowed_pct": round(single_limit_ratio * 100, 2),
                "actual_ratio_pct": round(actual_single_ratio_pct, 2),
                "is_exceeded": is_single_exceeded,
                "remaining_room": remaining_single_room
            },
            "connected_group": {
                "member_count": len(members_data),
                "members": members_data,
                "existing_group_debt": existing_group_debt,
                "total_group_exposure": total_group_exposure,
                "limit_amount": group_limit_amount,
                "limit_ratio_allowed_pct": round(group_limit_ratio * 100, 2),
                "actual_ratio_pct": round(actual_group_ratio_pct, 2),
                "is_exceeded": is_group_exceeded,
                "remaining_room": remaining_group_room
            },
            "room_analysis": {
                "is_exceeded": is_exceeded,
                "remaining_room_after_loan": overall_remaining_room,
                "max_allowable_loan": max_allowable_loan_for_applicant,
                "exceeded_amount": abs(overall_remaining_room) if is_exceeded else 0.0
            },
            "top_exposures": top_exposures,
            "risk_alerts": risk_alerts,
            "insights": insights,
            "recommended_actions": recommended_actions,
            "compliance_status": compliance_status
        }