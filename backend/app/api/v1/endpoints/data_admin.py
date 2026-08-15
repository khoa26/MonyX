from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.api.deps import require_roles
from app.models.schemas import UserResponse
from app.db.neo4j_client import db_client

router = APIRouter()

@router.post("/import-entities")
async def import_data_file(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(require_roles(["DATA_ADMIN"]))
):
    """
    Dành riêng cho DATA_ADMIN: Upload file (.xlsx, .csv, .json) để nạp thêm Company/Person/Quan hệ vào Neo4j
    """
    if not file.filename.endswith(('.csv', '.xlsx', '.json')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hệ thống chỉ hỗ trợ định dạng .csv, .xlsx hoặc .json"
        )
    return {
        "status": "success",
        "filename": file.filename,
        "message": f"Tệp {file.filename} đã được tải lên bởi {current_user.username}. Sẵn sàng xử lý đồ thị."
    }

@router.get("/database-stats")
def get_graph_stats(current_user: UserResponse = Depends(require_roles(["DATA_ADMIN", "CREDIT_OFFICER"]))):
    """Thống kê tổng số Nodes và Relationships hiện có trong database local"""
    node_count = db_client.execute_query("MATCH (n) RETURN count(n) as nodes")[0]["nodes"]
    rel_count = db_client.execute_query("MATCH ()-[r]->() RETURN count(r) as rels")[0]["rels"]
    return {
        "total_nodes": node_count,
        "total_relationships": rel_count,
        "mode": "Local Isolated Graph"
    }