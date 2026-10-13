import pytest

def test_patient_registration_flow(client):
    """Verify new patient can self-register and then successfully authenticate."""
    reg_payload = {
        "full_name": "Priya Rajesh Nair",
        "email": "priya.nair@example.org",
        "role": "patient",
        "password": "SecurePassword123!",
        "dob": "1994-08-15",
        "gender": "FEMALE",
        "patient_id": "ABHA-PRIYA-9988-2026"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "patient"
    assert data["linked_patient_id"] is not None

    # Test login with email
    login_res = client.post("/api/auth/login", json={
        "username": "priya.nair@example.org",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert token_data["role"] == "patient"
    assert "access_token" in token_data

def test_admin_public_registration_strictly_blocked(client):
    """Verify administrator public self-registration is strictly forbidden (403)."""
    admin_payload = {
        "full_name": "Rogue Admin Attempt",
        "email": "rogue.admin@example.org",
        "role": "admin",
        "password": "HackPassword123!"
    }
    res = client.post("/api/auth/register", json=admin_payload)
    assert res.status_code == 403
    assert "Administrator accounts cannot be registered publicly" in res.json()["detail"]

def test_invalid_name_rejected(client):
    """Verify full name with pure numbers/symbols is rejected (400)."""
    invalid_payload = {
        "full_name": "12345678",
        "email": "invalid.name@example.org",
        "role": "patient",
        "password": "Password123!"
    }
    res = client.post("/api/auth/register", json=invalid_payload)
    assert res.status_code == 400
    assert "cannot consist exclusively of numbers or symbols" in res.json()["detail"]

def test_duplicate_email_conflict(client):
    """Verify registering an existing email returns 409 Conflict."""
    payload = {
        "full_name": "Duplicate Test User",
        "email": "priya.nair@example.org",
        "role": "patient",
        "password": "AnotherPassword123!"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 409
    assert "already exists" in res.json()["detail"]
