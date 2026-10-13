import pytest
import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import app.seed.seed_data as seed_module
from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.security import create_access_token

TEST_DB_URL = "sqlite:///./test_unified_patient.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    # Override get_db in FastAPI app
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    
    # Seed initial test data using test DB session
    original_session = seed_module.SessionLocal
    seed_module.SessionLocal = TestingSessionLocal
    seed_module.seed_initial_data()
    seed_module.SessionLocal = original_session

    yield

    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_unified_patient.db"):
        try:
            os.remove("./test_unified_patient.db")
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_tokens(client):
    tokens = {}
    creds = {
        "admin": ("admin", "AdminPassword123!"),
        "receptionist": ("receptionist", "RecepPassword123!"),
        "doctor_mehta": ("doctor_mehta", "DoctorPassword123!"),
        "doctor_unassigned": ("doctor_unassigned", "DoctorPassword123!"),
        "patient_ananya": ("patient_ananya", "PatientPassword123!")
    }
    for role_key, (username, password) in creds.items():
        res = client.post("/api/auth/login", json={"username": username, "password": password})
        assert res.status_code == 200, f"Login failed for {username}: {res.text}"
        tokens[role_key] = res.json()["access_token"]
    return tokens
