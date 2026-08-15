from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import LoginRequest, Token, UserResponse
from app.db.neo4j_client import db_client
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest):
    """
    Xác thực nhân viên ngân hàng (Credit Officer / Data Admin)
    """
    cypher = """
    MATCH (u:User {username: $username}) 
    RETURN u.username as username, u.hashed_password as hashed_password, u.role as role
    """
    records = db_client.execute_query(cypher, {"username": login_data.username})
    
    if not records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác"
        )
    
    user = records[0]
    if not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác"
        )
    
    access_token = create_access_token(
        subject=user["username"],
        role=user["role"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user["role"]
    )

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user