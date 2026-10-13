import pytest
from app.services.matching_engine import (
    calculate_string_similarity,
    score_patient_pair,
    resolve_patient_identity
)
from app.models.patient import MasterPatient

def test_name_similarity_calculation():
    # Identical
    assert calculate_string_similarity("ananya", "ananya") == 1.0
    # Completely different
    assert calculate_string_similarity("alice", "bob") < 0.2
    # Minor typo (1 char edit)
    sim = calculate_string_similarity("sharma", "sharmaa")
    assert sim >= 0.85

def test_rule_never_merge_solely_on_name():
    """
    CRITICAL RULE:
    Two patients who happen to have the same name ('John Smith' vs 'John Smith')
    but completely different dates of birth must NOT be merged automatically.
    """
    source_demo = {
        "first_name": "John",
        "last_name": "Smith",
        "dob": "1992-05-12",
        "gender": "MALE",
        "phone": "+91-99999-00001"
    }

    candidate = MasterPatient(
        id=10,
        national_health_id="NHID-88123",
        first_name="John",
        last_name="Smith",
        dob="1960-11-25",  # Different DOB by 32 years!
        gender="MALE",
        phone="+91-88888-99999"  # Different phone
    )

    score, breakdown = score_patient_pair(source_demo, candidate)
    # Total score should be around name (0.30) + gender (0.10) = 0.40, WELL BELOW auto-match threshold (0.85)
    assert score < 0.55, f"Expected score < 0.55 for distinct patients with same name, got {score}"
    assert breakdown["dob"]["match"] == "MISMATCH"

def test_exact_match_on_national_id():
    source_demo = {
        "national_health_id": "ABHA-1234-5678-9999",
        "first_name": "Test",
        "last_name": "Patient",
        "dob": "1990-01-01"
    }
    candidate = MasterPatient(
        id=1,
        national_health_id="ABHA-1234-5678-9999",
        first_name="Test",
        last_name="Patient",
        dob="1990-01-01",
        gender="MALE"
    )
    score, breakdown = score_patient_pair(source_demo, candidate)
    assert score == 1.0
    assert breakdown["national_health_id"]["match"] == "EXACT_IDENTIFIER"

def test_uncertain_match_flagged_for_review(client, auth_tokens):
    """
    Verifies that uncertain matches (Anita Sharma vs Ananya Sharma)
    are placed into the pending review queue rather than silently merged.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    res = client.get("/api/integration/match-candidates", headers=headers)
    assert res.status_code == 200
    candidates = res.json()
    assert len(candidates) >= 1
    cand = candidates[0]
    assert cand["status"] == "PENDING"
    assert 0.55 <= cand["match_score"] < 0.85
