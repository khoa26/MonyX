from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.models.schemas import TokenPayload, UserResponse
from app.db.neo4j_client import db_client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực danh tính phiên đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenPayload(sub=username, role=role)
    except JWTError:
        raise credentials_exception
    
    # Query Cypher kiểm tra User trong Neo4j
    query = "MATCH (u:User {username: $username}) RETURN u.username as username, u.full_name as full_name, u.role as role"
    records = db_client.execute_query(query, {"username": token_data.sub})
    
    if not records:
        raise credentials_exception
        
    user_record = records[0]
    return UserResponse(
        username=user_record["username"],
        full_name=user_record["full_name"],
        role=user_record["role"]
    )

def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: UserResponse = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thực hiện hành động này"
            )
        return current_user
    return role_checker