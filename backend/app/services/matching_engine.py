import re
import json
from datetime import datetime, date
from typing import Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.patient import MasterPatient, SourcePatientRecord, IdentityMatchCandidate

def clean_str(val: Optional[str]) -> str:
    if not val:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', str(val)).lower().strip()

def clean_phone(val: Optional[str]) -> str:
    if not val:
        return ""
    digits = re.sub(r'\D', '', str(val))
    # Return last 10 digits if available
    return digits[-10:] if len(digits) >= 10 else digits

def calculate_string_similarity(s1: str, s2: str) -> float:
    """Calculates Levenshtein-based similarity ratio between 0.0 and 1.0"""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0
    
    len1, len2 = len(s1), len(s2)
    # Fast DP matrix for Levenshtein distance
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    for i in range(len1 + 1):
        matrix[i][0] = i
    for j in range(len2 + 1):
        matrix[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            matrix[i][j] = min(
                matrix[i - 1][j] + 1,       # deletion
                matrix[i][j - 1] + 1,       # insertion
                matrix[i - 1][j - 1] + cost # substitution
            )
    dist = matrix[len1][len2]
    max_len = max(len1, len2)
    return max(0.0, 1.0 - (dist / max_len))

def score_patient_pair(
    source_demo: Dict[str, Any],
    candidate: MasterPatient
) -> Tuple[float, Dict[str, Any]]:
    """
    Evaluates cross-facility demographic congruence.
    Returns:
        (total_score, score_breakdown)
    """
    breakdown = {}
    
    # 1. Deterministic National Health ID Check
    s_nhid = clean_str(source_demo.get("national_health_id"))
    c_nhid = clean_str(candidate.national_health_id)
    if s_nhid and c_nhid and s_nhid == c_nhid:
        breakdown["national_health_id"] = {"score": 1.0, "weight": 1.0, "match": "EXACT_IDENTIFIER"}
        return 1.0, breakdown

    # 2. Multi-factor Probabilistic Matching
    # A. Name Similarity (First name 15%, Last name 15%)
    s_first = clean_str(source_demo.get("first_name"))
    c_first = clean_str(candidate.first_name)
    first_sim = calculate_string_similarity(s_first, c_first)

    s_last = clean_str(source_demo.get("last_name"))
    c_last = clean_str(candidate.last_name)
    last_sim = calculate_string_similarity(s_last, c_last)

    name_score = (first_sim * 0.15) + (last_sim * 0.15)
    breakdown["name"] = {"score": name_score, "first_sim": round(first_sim, 2), "last_sim": round(last_sim, 2)}

    # B. Date of Birth (35% weight)
    s_dob_raw = source_demo.get("dob")
    s_dob = None
    if isinstance(s_dob_raw, str):
        try:
            s_dob = datetime.strptime(s_dob_raw.split("T")[0], "%Y-%m-%d").date()
        except ValueError:
            pass
    elif isinstance(s_dob_raw, (date, datetime)):
        s_dob = s_dob_raw if isinstance(s_dob_raw, date) else s_dob_raw.date()

    c_dob_raw = candidate.dob
    c_dob = None
    if isinstance(c_dob_raw, str):
        try:
            c_dob = datetime.strptime(c_dob_raw.split("T")[0], "%Y-%m-%d").date()
        except ValueError:
            pass
    elif isinstance(c_dob_raw, (date, datetime)):
        c_dob = c_dob_raw if isinstance(c_dob_raw, date) else c_dob_raw.date()

    dob_score = 0.0
    if s_dob and c_dob:
        if s_dob == c_dob:
            dob_score = 0.35
            breakdown["dob"] = {"score": 0.35, "match": "EXACT_DATE"}
        elif s_dob.year == c_dob.year and s_dob.month == c_dob.month:
            dob_score = 0.15  # same month/year, slight day difference
            breakdown["dob"] = {"score": 0.15, "match": "PARTIAL_MONTH_YEAR"}
        else:
            breakdown["dob"] = {"score": 0.0, "match": "MISMATCH"}
    else:
        breakdown["dob"] = {"score": 0.0, "match": "MISSING"}

    # C. Phone Number (25% weight)
    s_phone = clean_phone(source_demo.get("phone"))
    c_phone = clean_phone(candidate.phone)
    phone_score = 0.0
    if s_phone and c_phone:
        if s_phone == c_phone:
            phone_score = 0.25
            breakdown["phone"] = {"score": 0.25, "match": "EXACT_PHONE"}
        else:
            breakdown["phone"] = {"score": 0.0, "match": "DIFFERENT_PHONE"}
    else:
        breakdown["phone"] = {"score": 0.0, "match": "UNAVAILABLE"}

    # D. Gender (10% weight)
    s_gender = clean_str(source_demo.get("gender"))
    c_gender = clean_str(candidate.gender)
    gender_score = 0.0
    if s_gender and c_gender:
        if s_gender == c_gender:
            gender_score = 0.10
            breakdown["gender"] = {"score": 0.10, "match": "MATCH"}
        else:
            gender_score = -0.10  # penalty for explicit gender mismatch
            breakdown["gender"] = {"score": -0.10, "match": "MISMATCH"}
    else:
        breakdown["gender"] = {"score": 0.0, "match": "MISSING"}

    total_score = max(0.0, min(1.0, name_score + dob_score + phone_score + gender_score))
    return round(total_score, 3), breakdown

def resolve_patient_identity(
    db: Session,
    organization_id: int,
    source_system_patient_id: str,
    source_demo: Dict[str, Any]
) -> Tuple[Optional[MasterPatient], SourcePatientRecord, str]:
    """
    Evaluates an incoming source patient record against master patients:
    - If Exact Match (>0.85 and matching DOB/ID): Auto-links to MasterPatient.
    - If Uncertain Match (0.55 - 0.84): Marked as PENDING_REVIEW, adds candidate to queue, NO auto-merge.
    - If No Match (<0.55): Creates brand new MasterPatient.
    
    Returns:
        (master_patient_or_none, source_patient_record, match_decision_str)
    """
    # Check if this exact source record was already ingested
    existing_source = db.query(SourcePatientRecord).filter(
        SourcePatientRecord.organization_id == organization_id,
        SourcePatientRecord.source_system_patient_id == source_system_patient_id
    ).first()

    if existing_source and existing_source.master_patient:
        return existing_source.master_patient, existing_source, "EXISTING_LINKED"

    # Search existing master patients for potential matches
    candidates = db.query(MasterPatient).all()
    
    best_candidate: Optional[MasterPatient] = None
    best_score = 0.0
    best_breakdown = {}

    for cand in candidates:
        score, breakdown = score_patient_pair(source_demo, cand)
        if score > best_score:
            best_score = score
            best_candidate = cand
            best_breakdown = breakdown

    # Record source patient record
    source_record = SourcePatientRecord(
        organization_id=organization_id,
        source_system_patient_id=source_system_patient_id,
        raw_demographics_json=json.dumps(source_demo, default=str),
        match_score=best_score,
        match_criteria_json=json.dumps(best_breakdown)
    )

    # Decision logic
    if best_score >= 0.85 and best_candidate:
        # High confidence match (Deterministic or Multi-factor congruent)
        source_record.master_patient_id = best_candidate.id
        source_record.match_status = "MATCHED"
        db.add(source_record)
        db.commit()
        db.refresh(source_record)
        return best_candidate, source_record, "EXACT_AUTO_MATCH"

    elif 0.55 <= best_score < 0.85 and best_candidate:
        # UNCERTAIN MATCH:
        # DO NOT MERGE AUTOMATICALLY! Create a human review candidate item.
        source_record.match_status = "PENDING_REVIEW"
        source_record.master_patient_id = None
        db.add(source_record)
        db.commit()
        db.refresh(source_record)

        # Create candidate review item
        candidate_item = IdentityMatchCandidate(
            source_record_id=source_record.id,
            candidate_master_patient_id=best_candidate.id,
            match_score=best_score,
            match_criteria_json=json.dumps(best_breakdown),
            status="PENDING"
        )
        db.add(candidate_item)
        db.commit()
        return None, source_record, "UNCERTAIN_PENDING_REVIEW"

    else:
        # NO MATCH: create a new master patient record safely
        s_dob_raw = source_demo.get("dob")
        s_dob = None
        if isinstance(s_dob_raw, str):
            try:
                s_dob = datetime.strptime(s_dob_raw.split("T")[0], "%Y-%m-%d").date()
            except ValueError:
                s_dob = date(1980, 1, 1)
        elif isinstance(s_dob_raw, (date, datetime)):
            s_dob = s_dob_raw if isinstance(s_dob_raw, date) else s_dob_raw.date()
        else:
            s_dob = date(1980, 1, 1)

        new_master = MasterPatient(
            national_health_id=source_demo.get("national_health_id") or f"NHID-GEN-{int(datetime.utcnow().timestamp())}",
            first_name=source_demo.get("first_name", "Unknown"),
            last_name=source_demo.get("last_name", "Patient"),
            dob=s_dob,
            gender=source_demo.get("gender", "UNKNOWN"),
            blood_group=source_demo.get("blood_group"),
            phone=source_demo.get("phone"),
            email=source_demo.get("email"),
            address=source_demo.get("address"),
            emergency_contact_name=source_demo.get("emergency_contact_name"),
            emergency_contact_phone=source_demo.get("emergency_contact_phone")
        )
        db.add(new_master)
        db.flush()

        source_record.master_patient_id = new_master.id
        source_record.match_status = "MATCHED"
        db.add(source_record)
        db.commit()
        db.refresh(new_master)
        db.refresh(source_record)
        return new_master, source_record, "NEW_MASTER_CREATED"
