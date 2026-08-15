from app.db.neo4j_client import db_client
from app.core.security import get_password_hash
import os

def init_neo4j_constraints_and_seed():
    """Khởi tạo Constraints, 2 User Roles và nạp Seed Data"""
    constraints = [
        "CREATE CONSTRAINT user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE",
        "CREATE CONSTRAINT customer_cif_unique IF NOT EXISTS FOR (c:Customer) REQUIRE c.cif IS UNIQUE",
        "CREATE CONSTRAINT company_tax_code_unique IF NOT EXISTS FOR (comp:Company) REQUIRE comp.tax_code IS UNIQUE",
        "CREATE CONSTRAINT person_cccd_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.cccd IS UNIQUE",
        "CREATE CONSTRAINT app_code_unique IF NOT EXISTS FOR (a:Application) REQUIRE a.app_code IS UNIQUE"
    ]
    for c in constraints:
        try:
            db_client.execute_query(c)
        except Exception:
            pass

    # Khởi tạo 2 Loại tài khoản
    default_users = [
        {
            "username": "officer",
            "password": "officer123",
            "full_name": "Cán Bộ Thẩm Định Tín Dụng",
            "role": "CREDIT_OFFICER"
        },
        {
            "username": "admin",
            "password": "admin123",
            "full_name": "Kỹ Sư Quản Trị Cơ Sở Dữ Liệu",
            "role": "DATA_ADMIN"
        }
    ]

    for u in default_users:
        find_query = "MATCH (usr:User {username: $username}) RETURN usr"
        exists = db_client.execute_query(find_query, {"username": u["username"]})
        if not exists:
            create_query = """
            CREATE (usr:User {
                username: $username,
                full_name: $full_name,
                hashed_password: $hashed_password,
                role: $role,
                created_at: datetime()
            })
            """
            db_client.execute_query(create_query, {
                "username": u["username"],
                "full_name": u["full_name"],
                "hashed_password": get_password_hash(u["password"]),
                "role": u["role"]
            })
            print(f"[Init DB] Seeded {u['role']}: {u['username']}")

    # Kiểm tra nạp seed data nếu graph chưa có Company
    comp_check = db_client.execute_query("MATCH (c:Company) RETURN count(c) as total")
    if comp_check and comp_check[0]["total"] == 0:
        seed_path = os.path.join(os.path.dirname(__file__), "seed_data.cypher")
        if os.path.exists(seed_path):
            with open(seed_path, "r", encoding="utf-8") as f:
                for stmt in f.read().split(";"):
                    if stmt.strip():
                        db_client.execute_query(stmt.strip())
            print("[Init DB] Seed data Cypher đã được nạp thành công.")