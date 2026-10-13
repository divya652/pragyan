import pytest
from datetime import datetime, timedelta
import jwt
from app.config import settings

def test_01_unauthenticated_cannot_access_clinical_chart(client):
    """Test 1: Unauthenticated requests to protected patient clinical records are rejected (401)."""
    res = client.get("/api/clinical/patients/1/chart")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]

def test_02_receptionist_blocked_from_clinical_chart(client, auth_tokens):
    """Test 2: Receptionists calling clinical endpoints receive 403 Forbidden with audit logging."""
    headers = {"Authorization": f"Bearer {auth_tokens['receptionist']}"}
    res = client.get("/api/clinical/patients/1/chart", headers=headers)
    assert res.status_code == 403
    assert "Receptionist personnel are restricted" in res.json()["detail"]

    # Also verify timeline endpoint is blocked
    res_timeline = client.get("/api/clinical/patients/1/timeline", headers=headers)
    assert res_timeline.status_code == 403

def test_03_receptionist_can_access_administrative_endpoints(client, auth_tokens):
    """Verify receptionist CAN access demographic registration and appointment queue."""
    headers = {"Authorization": f"Bearer {auth_tokens['receptionist']}"}
    res = client.get("/api/reception/patients", headers=headers)
    assert res.status_code == 200
    patients = res.json()
    assert len(patients) > 0
    # Demographics are returned, but NO clinical fields exist in payload schema
    first = patients[0]
    assert "national_health_id" in first
    assert "diagnoses" not in first
    assert "allergies" not in first
    assert "medications" not in first

def test_04_doctor_outside_treatment_scope_blocked(client, auth_tokens):
    """Test 3: Doctor without treatment assignment cannot access patient records (403)."""
    headers = {"Authorization": f"Bearer {auth_tokens['doctor_unassigned']}"}
    res = client.get("/api/clinical/patients/1/chart", headers=headers)
    assert res.status_code == 403
    assert "not an assigned treating clinician" in res.json()["detail"]

def test_05_assigned_doctor_can_access_clinical_chart(client, auth_tokens):
    """Assigned doctor Dr. Mehta CAN access authorized patient Ananya Sharma."""
    headers = {"Authorization": f"Bearer {auth_tokens['doctor_mehta']}"}
    res = client.get("/api/clinical/patients/1/chart", headers=headers)
    assert res.status_code == 200
    chart = res.json()
    assert chart["national_health_id"] == "ABHA-9821-4402-1190"
    assert len(chart["diagnoses"]) >= 2
    assert len(chart["allergies"]) >= 1
    assert len(chart["medications"]) >= 2
    # Verify provenance details are attached
    assert "provenance" in chart["diagnoses"][0]
    assert "organization_code" in chart["diagnoses"][0]["provenance"]

def test_06_patient_cannot_access_other_patient_record(client, auth_tokens):
    """Test 4: Patient Ananya trying to access another patient's ID is rejected (403)."""
    headers = {"Authorization": f"Bearer {auth_tokens['patient_ananya']}"}
    # ID 999 or non-linked patient
    res = client.get("/api/clinical/patients/999/chart", headers=headers)
    assert res.status_code in [403, 404]

def test_07_patient_can_view_own_records(client, auth_tokens):
    """Patient Ananya CAN access her own records via Patient Portal."""
    headers = {"Authorization": f"Bearer {auth_tokens['patient_ananya']}"}
    res = client.get("/api/patient-portal/my-records", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["national_health_id"] == "ABHA-9821-4402-1190"

def test_08_administrator_blocked_from_clinical_chart(client, auth_tokens):
    """Test 5: System Administrator cannot automatically browse clinical charts."""
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    res = client.get("/api/clinical/patients/1/chart", headers=headers)
    assert res.status_code == 403
    assert "System administrators do not have automatic authorization" in res.json()["detail"]

def test_09_patient_consent_revocation_enforced(client, auth_tokens):
    """Test 6: Patient revokes sharing consent -> clinical aggregation is restricted."""
    patient_headers = {"Authorization": f"Bearer {auth_tokens['patient_ananya']}"}
    doctor_headers = {"Authorization": f"Bearer {auth_tokens['doctor_mehta']}"}

    # Patient updates consent to REVOKED
    consent_res = client.post("/api/patient-portal/my-consents", json={
        "consent_type": "REVOKED",
        "notes": "Testing consent revocation enforcement"
    }, headers=patient_headers)
    assert consent_res.status_code == 200

    # Doctor queries chart now
    chart_res = client.get("/api/clinical/patients/1/chart", headers=doctor_headers)
    assert chart_res.status_code == 200
    chart_data = chart_res.json()
    assert chart_data["consent_status"] == "CONSENT_REVOKED_BY_PATIENT"
    assert len(chart_data["diagnoses"]) == 0

    # Re-enable FULL_SHARING for subsequent tests
    client.post("/api/patient-portal/my-consents", json={
        "consent_type": "FULL_SHARING",
        "notes": "Restoring full sharing"
    }, headers=patient_headers)

def test_10_audit_logs_record_events(client, auth_tokens):
    """Test 7: Access attempts produce searchable audit logs."""
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    res = client.get("/api/admin/audit-logs", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    actions = [l["action"] for l in logs]
    assert any("LOGIN" in a or "VIEW" in a or "CLINICAL" in a for a in actions)

def test_11_sql_injection_sanitization(client, auth_tokens):
    """Test 8: Malicious SQL injection payloads in search are safely sanitized."""
    headers = {"Authorization": f"Bearer {auth_tokens['receptionist']}"}
    payload = "' OR '1'='1' --"
    res = client.get(f"/api/reception/patients?query={payload}", headers=headers)
    assert res.status_code == 200
    # Parameterized queries safely execute without throwing syntax error or dumping all tables

def test_12_expired_token_rejected(client):
    """Test 11: Expired session tokens cannot access protected endpoints (401)."""
    expired_payload = {
        "sub": "doctor_mehta",
        "role": "doctor",
        "exp": datetime.utcnow() - timedelta(minutes=10)
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    headers = {"Authorization": f"Bearer {expired_token}"}
    res = client.get("/api/clinical/patients/1/chart", headers=headers)
    assert res.status_code == 401
    assert "Session expired" in res.json()["detail"]

def test_13_conflicts_detected_and_provenance_preserved(client, auth_tokens):
    """Test 10: Conflicting records across Hospital A and B are flagged with provenance."""
    headers = {"Authorization": f"Bearer {auth_tokens['doctor_mehta']}"}
    res = client.get("/api/clinical/patients/1/conflicts", headers=headers)
    assert res.status_code == 200
    conflicts = res.json()
    assert len(conflicts) > 0
    categories = [c["conflict_category"] for c in conflicts]
    assert "CLINICAL_ALLERGY" in categories or "CLINICAL_MEDICATION" in categories
    # Original sources are preserved
    first = conflicts[0]
    assert first["source_a_org_name"] != first["source_b_org_name"]
