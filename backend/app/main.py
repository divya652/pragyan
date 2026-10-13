from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
import app.models  # Ensures all SQLAlchemy models are registered
from app.routers import (
    auth,
    reception,
    clinical,
    patient_portal,
    appointments,
    admin,
    integration,
    opd,
    lab,
    pharmacy,
    billing,
    notifications,
    doctor_portal
)
from app.seed.seed_data import seed_initial_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed initial test data (Roles, Hospitals, Realistic synthetic records)
    seed_initial_data()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Consolidates multi-hospital health records into a single longitudinal timeline while enforcing least privilege RBAC, identity resolution, provenance attribution, conflict detection, and patient consent.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(reception.router, prefix=settings.API_V1_STR)
app.include_router(clinical.router, prefix=settings.API_V1_STR)
app.include_router(patient_portal.router, prefix=settings.API_V1_STR)
app.include_router(appointments.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(integration.router, prefix=settings.API_V1_STR)
app.include_router(opd.router, prefix=settings.API_V1_STR)
app.include_router(lab.router, prefix=settings.API_V1_STR)
app.include_router(pharmacy.router, prefix=settings.API_V1_STR)
app.include_router(billing.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(doctor_portal.router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
