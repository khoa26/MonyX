from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db.neo4j_client import db_client
from app.db.init_db import init_neo4j_constraints_and_seed
from app.api.v1.endpoints import auth, data_admin
from app.api.v1.endpoints import credit

@asynccontextmanager
async def lifespan(app: FastAPI):
    db_client.connect()
    try:
        init_neo4j_constraints_and_seed()
    except Exception as e:
        print(f"[Init Warning] {e}")
    yield
    db_client.close()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(data_admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Data Admin Operations"])
app.include_router(credit.router, prefix=f"{settings.API_V1_STR}/credit", tags=["Credit Underwriting"])

@app.get("/health")
def health():
    res = db_client.execute_query("RETURN 'Neo4j is Ready' as msg")
    return {"status": "ok", "db": res[0]["msg"]}