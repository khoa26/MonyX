MERGE (shi:Company {cif: "CIF00087", tax_code: "0301988776", name: "Công ty Cổ phần Sông Hồng Invest", exposure: 1200000000000})
MERGE (shl:Company {cif: "CIF00091", tax_code: "0305678912", name: "Công ty TNHH Sông Hồng Land", exposure: 763000000000})
MERGE (cl:Company {cif: "CIF00623", tax_code: "0309887744", name: "Công ty TNHH Đầu tư Cửu Long", exposure: 420000000000, address: "88 Nguyễn Huệ, P.Bến Nghé, Q.1, TP.HCM", chief_accountant: "Lê Thị Ngọc Hà", rep_name: "Phạm Văn Đức"})
MERGE (tqb:Person {cif: "CIF00088", cccd: "001081012345", name: "Trần Quốc Bảo", birth_date: "12/03/1978", address: "88 Nguyễn Huệ, P.Bến Nghé, Q.1, TP.HCM", exposure: 320000000000})
MERGE (tqb)-[:MANAGED_BY {role: "Chủ tịch HĐQT", legal_basis: "Khoản 24 Điều 4 điểm d"}]->(shi)
MERGE (shi)-[:PARENT_OF {ownership: 100, legal_basis: "Khoản 24 Điều 4 điểm b"}]->(shl)
MERGE (tqb)-[:MANAGED_BY {role: "Chủ tịch HĐTV", legal_basis: "Khoản 24 Điều 4 điểm d"}]->(shl);