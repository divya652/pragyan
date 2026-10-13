import json
from datetime import datetime, date
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.organization import HealthcareOrganization
from app.models.patient import MasterPatient
from app.models.clinical import (
    ClinicalEncounter,
    ClinicalDiagnosis,
    ClinicalAllergy,
    ClinicalMedication,
    ClinicalLabResult
)
from app.services.matching_engine import resolve_patient_identity
from app.services.conflict_engine import detect_and_record_conflicts

def parse_date(date_str: Any) -> Optional[date]:
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    if isinstance(date_str, datetime):
        return date_str.date()
    try:
        clean = str(date_str).split("T")[0].strip()
        return datetime.strptime(clean, "%Y-%m-%d").date()
    except Exception:
        return None

def parse_datetime(dt_str: Any) -> datetime:
    if not dt_str:
        return datetime.utcnow()
    if isinstance(dt_str, datetime):
        return dt_str
    try:
        clean = str(dt_str).replace("Z", "").strip()
        if "T" in clean:
            return datetime.fromisoformat(clean)
        return datetime.strptime(clean, "%Y-%m-%d")
    except Exception:
        return datetime.utcnow()

def normalize_and_import_hospital_a_fhir(
    db: Session,
    org: HealthcareOrganization,
    fhir_bundle: Dict[str, Any]
) -> Tuple[int, int, int]:
    """
    Ingests standard HL7 FHIR R4 bundle from Hospital A (Metro General Hospital).
    Extracts Patient, Encounter, Condition, AllergyIntolerance, MedicationRequest, DiagnosticReport.
    """
    entries = fhir_bundle.get("entry", [])
    records_processed = 0
    records_matched = 0
    conflicts_count = 0

    patient_res = None
    encounters = []
    conditions = []
    allergies = []
    medications = []
    labs = []

    for item in entries:
        res = item.get("resource", {})
        rtype = res.get("resourceType")
        if rtype == "Patient":
            patient_res = res
        elif rtype == "Encounter":
            encounters.append(res)
        elif rtype == "Condition":
            conditions.append(res)
        elif rtype == "AllergyIntolerance":
            allergies.append(res)
        elif rtype == "MedicationRequest":
            medications.append(res)
        elif rtype == "DiagnosticReport":
            labs.append(res)

    if not patient_res:
        return 0, 0, 0

    # Extract FHIR demographics
    source_pid = str(patient_res.get("id", "FHIR-UNKNOWN"))
    name_list = patient_res.get("name", [{}])
    name_obj = name_list[0] if name_list else {}
    given = " ".join(name_obj.get("given", [])) or "Unknown"
    family = name_obj.get("family", "Unknown")
    
    telecom = patient_res.get("telecom", [])
    phone = next((t.get("value") for t in telecom if t.get("system") == "phone"), None)
    email = next((t.get("value") for t in telecom if t.get("system") == "email"), None)
    
    address_list = patient_res.get("address", [])
    address = address_list[0].get("text") if address_list else None

    # Check for National Identifier (e.g., ABHA / NHID)
    identifiers = patient_res.get("identifier", [])
    national_id = next((i.get("value") for i in identifiers if i.get("system") == "urn:national:health-id"), None)

    demographics = {
        "first_name": given,
        "last_name": family,
        "dob": parse_date(patient_res.get("birthDate")),
        "gender": patient_res.get("gender", "UNKNOWN").upper(),
        "blood_group": patient_res.get("extension", [{}])[0].get("valueString") if patient_res.get("extension") else None,
        "phone": phone,
        "email": email,
        "address": address,
        "national_health_id": national_id,
        "emergency_contact_name": "Family Member",
        "emergency_contact_phone": phone
    }

    # Run identity matching
    master_patient, source_rec, match_type = resolve_patient_identity(
        db=db,
        organization_id=org.id,
        source_system_patient_id=source_pid,
        source_demo=demographics
    )
    records_processed += 1
    if match_type in ["EXACT_AUTO_MATCH", "EXISTING_LINKED", "NEW_MASTER_CREATED"]:
        records_matched += 1

    if not master_patient:
        # Held in PENDING_REVIEW
        return records_processed, records_matched, 0

    # Ingest encounters
    encounter_db_map = {}
    for enc in encounters:
        enc_id = str(enc.get("id", f"ENC-{encounters.index(enc)}"))
        enc_type = enc.get("class", {}).get("code", "OUTPATIENT").upper()
        reason = enc.get("reasonCode", [{}])[0].get("text") if enc.get("reasonCode") else "Routine Care"
        period = enc.get("period", {})
        start_date = parse_datetime(period.get("start"))
        end_date = parse_datetime(period.get("end")) if period.get("end") else None
        provider = enc.get("participant", [{}])[0].get("individual", {}).get("display", "Staff Physician")

        ce = ClinicalEncounter(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            source_encounter_id=enc_id,
            encounter_type=enc_type,
            reason=reason,
            provider_name=provider,
            encounter_date=start_date,
            discharge_date=end_date,
            department="General Medicine",
            clinical_notes=f"FHIR Encounter: {reason}",
            raw_json=json.dumps(enc)
        )
        db.add(ce)
        db.flush()
        encounter_db_map[enc_id] = ce.id
        records_processed += 1

    # Ingest Conditions / Diagnoses
    for cond in conditions:
        code_obj = cond.get("code", {}).get("coding", [{}])[0]
        icd = code_obj.get("code", "R69")
        desc = cond.get("code", {}).get("text") or code_obj.get("display") or "Unspecified condition"
        severity = cond.get("severity", {}).get("text", "MODERATE").upper()
        onset = parse_date(cond.get("onsetDateTime"))
        status = cond.get("clinicalStatus", {}).get("coding", [{}])[0].get("code", "active").upper()

        cd = ClinicalDiagnosis(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            encounter_id=list(encounter_db_map.values())[0] if encounter_db_map else None,
            icd10_code=icd,
            description=desc,
            severity=severity,
            clinical_status=status,
            onset_date=onset,
            recorded_at=parse_datetime(cond.get("recordedDate"))
        )
        db.add(cd)
        records_processed += 1

    # Ingest Allergies
    for alg in allergies:
        substance = alg.get("code", {}).get("text") or "Unknown allergen"
        reaction = alg.get("reaction", [{}])[0].get("manifestation", [{}])[0].get("text", "Hives / Rash")
        crit = alg.get("criticality", "high").upper()
        status = alg.get("verificationStatus", {}).get("coding", [{}])[0].get("code", "confirmed").upper()

        ca = ClinicalAllergy(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            allergen=substance,
            reaction=reaction,
            severity="SEVERE" if "high" in crit.lower() else "MODERATE",
            verification_status=status,
            recorded_at=parse_datetime(alg.get("recordedDate"))
        )
        db.add(ca)
        records_processed += 1

    # Ingest Medications
    for med in medications:
        med_name = med.get("medicationCodeableConcept", {}).get("text", "Prescribed Medication")
        dosage = med.get("dosageInstruction", [{}])[0].get("text", "Standard Dose")
        status = med.get("status", "active").upper()
        authored = parse_datetime(med.get("authoredOn"))

        cm = ClinicalMedication(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            medication_name=med_name,
            dosage=dosage,
            status=status,
            start_date=authored.date(),
            prescriber_name="Dr. Metro Hospital Staff",
            recorded_at=authored
        )
        db.add(cm)
        records_processed += 1

    # Ingest Labs
    for rep in labs:
        test_name = rep.get("code", {}).get("text", "Laboratory Analysis")
        val = rep.get("conclusion", "Within normal limits")
        issued = parse_datetime(rep.get("issued"))

        clr = ClinicalLabResult(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            test_name=test_name,
            result_value=val,
            flag="NORMAL" if "normal" in val.lower() else "HIGH",
            test_date=issued,
            status="FINAL"
        )
        db.add(clr)
        records_processed += 1

    db.commit()

    # Trigger conflict detection across available records
    detect_and_record_conflicts(db, master_patient_id=master_patient.id)
    return records_processed, records_matched, conflicts_count

def normalize_and_import_hospital_b_legacy(
    db: Session,
    org: HealthcareOrganization,
    legacy_payload: Dict[str, Any]
) -> Tuple[int, int, int]:
    """
    Ingests proprietary legacy EHR JSON/records from Hospital B (St. Jude Community Health).
    Handles non-standard field names: 'pat_fname', 'pat_lname', 'pat_dob', 'rx_list', etc.
    """
    patient_info = legacy_payload.get("patient_demographics", {})
    if not patient_info:
        return 0, 0, 0

    source_pid = str(patient_info.get("pat_id", "LEGACY-B-UNKNOWN"))
    demographics = {
        "first_name": patient_info.get("pat_fname", "Unknown"),
        "last_name": patient_info.get("pat_lname", "Patient"),
        "dob": parse_date(patient_info.get("pat_dob")),
        "gender": patient_info.get("pat_gender", "UNKNOWN").upper(),
        "blood_group": patient_info.get("pat_blood_type"),
        "phone": patient_info.get("pat_phone"),
        "email": patient_info.get("pat_email"),
        "address": patient_info.get("pat_residential_address"),
        "national_health_id": patient_info.get("pat_national_id"),
        "emergency_contact_name": patient_info.get("pat_kin_name"),
        "emergency_contact_phone": patient_info.get("pat_kin_phone")
    }

    records_processed = 1
    records_matched = 0

    # Run identity matching
    master_patient, source_rec, match_type = resolve_patient_identity(
        db=db,
        organization_id=org.id,
        source_system_patient_id=source_pid,
        source_demo=demographics
    )

    if match_type in ["EXACT_AUTO_MATCH", "EXISTING_LINKED", "NEW_MASTER_CREATED"]:
        records_matched += 1

    if not master_patient:
        return records_processed, records_matched, 0

    # Ingest legacy encounters
    for enc in legacy_payload.get("visit_history", []):
        ce = ClinicalEncounter(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            source_encounter_id=str(enc.get("visit_ref", f"VISIT-{int(datetime.utcnow().timestamp())}")),
            encounter_type=enc.get("visit_setting", "OUTPATIENT").upper(),
            reason=enc.get("chief_complaint", "Follow-up"),
            provider_name=enc.get("attending_doc", "Community Physician"),
            encounter_date=parse_datetime(enc.get("admission_time")),
            discharge_date=parse_datetime(enc.get("discharge_time")) if enc.get("discharge_time") else None,
            department=enc.get("clinic_unit", "Family Practice"),
            clinical_notes=enc.get("physician_summary"),
            raw_json=json.dumps(enc)
        )
        db.add(ce)
        records_processed += 1

    # Ingest legacy conditions
    for cond in legacy_payload.get("diagnoses_recorded", []):
        cd = ClinicalDiagnosis(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            icd10_code=cond.get("code_icd10"),
            description=cond.get("condition_title", "Condition"),
            severity=cond.get("acuity", "MODERATE").upper(),
            clinical_status=cond.get("status", "ACTIVE").upper(),
            onset_date=parse_date(cond.get("first_noted_date")),
            recorded_at=parse_datetime(cond.get("logged_date"))
        )
        db.add(cd)
        records_processed += 1

    # Ingest legacy allergies
    for alg in legacy_payload.get("allergies_reported", []):
        ca = ClinicalAllergy(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            allergen=alg.get("agent_substance", "Allergen"),
            reaction=alg.get("symptoms", "Adverse Reaction"),
            severity=alg.get("danger_level", "MODERATE").upper(),
            verification_status=alg.get("status", "CONFIRMED").upper(),
            recorded_at=parse_datetime(alg.get("date_identified"))
        )
        db.add(ca)
        records_processed += 1

    # Ingest legacy medications
    for med in legacy_payload.get("medications_active", []):
        cm = ClinicalMedication(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            medication_name=med.get("brand_or_generic", "Medication"),
            dosage=med.get("dosage_strength", "Standard"),
            frequency=med.get("timing_schedule"),
            status=med.get("regimen_status", "ACTIVE").upper(),
            start_date=parse_date(med.get("prescribed_on")),
            prescriber_name=med.get("signing_doctor", "Hospital B Doctor"),
            instructions=med.get("patient_instructions"),
            recorded_at=parse_datetime(med.get("prescribed_on"))
        )
        db.add(cm)
        records_processed += 1

    # Ingest legacy lab panels
    for lab in legacy_payload.get("diagnostic_lab_tests", []):
        clr = ClinicalLabResult(
            master_patient_id=master_patient.id,
            organization_id=org.id,
            test_name=lab.get("test_description", "Diagnostic Test"),
            loinc_code=lab.get("code_loinc"),
            result_value=str(lab.get("reading_value", "")),
            unit=lab.get("unit_of_measure"),
            reference_range=lab.get("standard_range"),
            flag=lab.get("abnormality_flag", "NORMAL").upper(),
            test_date=parse_datetime(lab.get("specimen_drawn_at")),
            status="FINAL",
            comments=lab.get("pathologist_note")
        )
        db.add(clr)
        records_processed += 1

    db.commit()

    # Trigger conflict detection across available records
    detect_and_record_conflicts(db, master_patient_id=master_patient.id)
    return records_processed, records_matched, 0
