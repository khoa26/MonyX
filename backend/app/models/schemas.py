from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# ==========================================
# 1. AUTH SCHEMAS (Đang thiếu gây lỗi)
# ==========================================

class LoginRequest(BaseModel):
    username: str = Field(..., description="Tên đăng nhập hoặc email")
    password: str = Field(..., description="Mật khẩu tài khoản")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    role: str = "customer" # 'customer' hoặc 'admin' / 'bank_staff'


class UserCreate(UserBase):
    password: str

class UserResponse(BaseModel):
    username: str
    full_name: str
    role: str
    
class UserResponse(UserBase):
    id: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True

# ==========================================
# 2. LOAN & RECOMMENDATION SCHEMAS (Dự phòng cho các endpoint vay)
# ==========================================

class LoanRecommendationRequest(BaseModel):
    customer_id: str
    monthly_income: float
    requested_amount: float
    loan_purpose: str
    loan_term_months: int

class LoanProductResponse(BaseModel):
    product_id: str
    product_name: str
    interest_rate: float
    max_amount: float
    min_term_months: int
    max_term_months: int
    description: Optional[str] = None