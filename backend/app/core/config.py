from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "MonyX - Credit Risk Intelligence API"
    API_V1_STR: str = "/api/v1"
    
    # Neo4j Database Config
    NEO4J_URI: str = "bolt://neo4j:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "monyx_secret_password_2026"
    
    # JWT Security Config
    JWT_SECRET_KEY: str = "monyx_super_secret_jwt_key_risk_compliance_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 tiếng cho phiên làm việc

    class Config:
        case_sensitive = True
        extra = "allow"

settings = Settings()