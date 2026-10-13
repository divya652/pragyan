from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.patient import MasterPatient
from app.models.organization import HealthcareOrganization
from app.models.clinical import (
    ClinicalEncounter,
    ClinicalDiagnosis,
    ClinicalAllergy,
    ClinicalMedication,
    ClinicalLabResult,
    ClinicalRadiology
)
from app.models.conflict import DataConflict
from app.services.consent_engine import evaluate_patient_sharing_consent

def get_unified_patient_chart(
    db: Session,
    patient: MasterPatient,
    is_emergency: bool = False
) -> Dict[str, Any]:
    """
    Consolidates clinical data across all permitted source institutions
    into one coherent longitudinal view with complete provenance attribution.
    """
    is_permitted, allowed_org_ids, consent_status = evaluate_patient_sharing_consent(
        db, patient.id, is_emergency=is_emergency
    )

    if not is_permitted:
        return {
            "patient_id": patient.id,
            "national_health_id": patient.national_health_id,
            "full_name": f"{patient.first_name} {patient.last_name}",
            "dob": patient.dob,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "contributing_sources": [],
            "active_conflicts_count": 0,
            "consent_status": consent_status,
            "diagnoses": [],
            "allergies": [],
            "medications": [],
            "lab_results": [],
            "radiology": [],
            "encounters": []
        }

    # Fetch organizations map
    orgs = {org.id: org for org in db.query(HealthcareOrganization).all()}

    # 1. Diagnoses
    diagnoses_records = db.query(ClinicalDiagnosis).filter(
        ClinicalDiagnosis.master_patient_id == patient.id,
        ClinicalDiagnosis.organization_id.in_(allowed_org_ids)
    ).order_by(ClinicalDiagnosis.recorded_at.desc()).all()

    diagnoses = []
    for d in diagnoses_records:
        org = orgs.get(d.organization_id)
        diagnoses.append({
            "id": d.id,
            "icd10_code": d.icd10_code,
            "description": d.description,
            "severity": d.severity,
            "clinical_status": d.clinical_status,
            "onset_date": d.onset_date,
            "provenance": {
                "organization_code": org.code if org else "UNKNOWN",
                "organization_name": org.name if org else "Unknown Facility",
                "recorded_at": d.recorded_at
            }
        })

    # 2. Allergies
    allergies_records = db.query(ClinicalAllergy).filter(
        ClinicalAllergy.master_patient_id == patient.id,
        ClinicalAllergy.organization_id.in_(allowed_org_ids)
    ).order_by(ClinicalAllergy.recorded_at.desc()).all()

    allergies = []
    for a in allergies_records:
        org = orgs.get(a.organization_id)
        allergies.append({
            "id": a.id,
            "allergen": a.allergen,
            "reaction": a.reaction,
            "severity": a.severity,
            "verification_status": a.verification_status,
            "provenance": {
                "organization_code": org.code if org else "UNKNOWN",
                "organization_name": org.name if org else "Unknown Facility",
                "recorded_at": a.recorded_at
            }
        })

    # 3. Medications
    meds_records = db.query(ClinicalMedication).filter(
        ClinicalMedication.master_patient_id == patient.id,
        ClinicalMedication.organization_id.in_(allowed_org_ids)
    ).order_by(ClinicalMedication.recorded_at.desc()).all()

    medications = []
    for m in meds_records:
        org = orgs.get(m.organization_id)
        medications.append({
            "id": m.id,
            "medication_name": m.medication_name,
            "dosage": m.dosage,
            "route": m.route,
            "frequency": m.frequency,
            "status": m.status,
            "start_date": m.start_date,
            "end_date": m.end_date,
            "prescriber_name": m.prescriber_name,
            "instructions": m.instructions,
            "provenance": {
                "organization_code": org.code if org else "UNKNOWN",
                "organization_name": org.name if org else "Unknown Facility",
                "recorded_at": m.recorded_at
            }
        })

    # 4. Lab Results
    labs_records = db.query(ClinicalLabResult).filter(
        ClinicalLabResult.master_patient_id == patient.id,
        ClinicalLabResult.organization_id.in_(allowed_org_ids)
    ).order_by(ClinicalLabResult.test_date.desc()).all()

    labs = []
    for l in labs_records:
        org = orgs.get(l.organization_id)
        labs.append({
            "id": l.id,
            "test_name": l.test_name,
            "loinc_code": l.loinc_code,
            "result_value": l.result_value,
            "unit": l.unit,
            "reference_range": l.reference_range,
            "flag": l.flag,
            "test_date": l.test_date,
            "status": l.status,
            "comments": l.comments,
            "provenance": {
                "organization_code": org.code if org else "UNKNOWN",
                "organization_name": org.name if org else "Unknown Facility",
                "recorded_at": l.test_date
            }
        })

    # 5. Radiology Imaging Studies
    radiology_records = db.query(ClinicalRadiology).filter(
        ClinicalRadiology.master_patient_id == patient.id,
        ClinicalRadiology.organization_id.in_(allowed_org_ids)
    ).order_by(ClinicalRadiology.study_date.desc()).all()

    radiology = []
    for r in radiology_records:
        org = orgs.get(r.organization_id)
        radiology.append({
            "id": r.id,
            "study_type": r.study_type,
            "modality": r.modality,
            "body_region": r.body_region,
            "study_date": r.study_date,
            "status": r.status,
            "summary": r.summary,
            "impression": r.impression,
            "radiologist_name": r.radiologist_name,
            "image_url": r.image_url,
            "dicom_series_uid": r.dicom_series_uid,
            "provenance": {
                "organization_code": org.code if org else "UNKNOWN",
                "organization_name": org.name if org else "Unknown Facility",
                "recorded_at": r.study_date
            }
        })

    # 6. Encounters
    encs_records = db.query(ClinicalEncounter).filter(
        ClinicalEncounter.master_patient_id == patient.id,
        ClinicalEncounter.organization_id.in_(allowed_org_ids)
    ).order_by(ClinicalEncounter.encounter_date.desc()).all()

    encounters = []
    for e in encs_records:
        org = orgs.get(e.organization_id)
        encounters.append({
            "id": e.id,
            "source_encounter_id": e.source_encounter_id,
            "encounter_type": e.encounter_type,
            "reason": e.reason,
            "provider_name": e.provider_name,
            "encounter_date": e.encounter_date,
            "discharge_date": e.discharge_date,
            "department": e.department,
            "clinical_notes": e.clinical_notes,
            "provenance": {
                "organization_code": org.code if org else "UNKNOWN",
                "organization_name": org.name if org else "Unknown Facility",
                "recorded_at": e.encounter_date
            }
        })

    # Contributing sources calculation
    contributing_org_ids = set()
    for coll in [diagnoses_records, allergies_records, meds_records, labs_records, radiology_records, encs_records]:
        for item in coll:
            contributing_org_ids.add(item.organization_id)

    contributing_names = [orgs[oid].name for oid in contributing_org_ids if oid in orgs]

    # Open conflicts count
    conflicts_count = db.query(DataConflict).filter(
        DataConflict.master_patient_id == patient.id,
        DataConflict.resolution_status == "OPEN"
    ).count()

    return {
        "patient_id": patient.id,
        "national_health_id": patient.national_health_id,
        "full_name": f"{patient.first_name} {patient.last_name}",
        "dob": patient.dob,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "contributing_sources": contributing_names,
        "active_conflicts_count": conflicts_count,
        "consent_status": consent_status,
        "diagnoses": diagnoses,
        "allergies": allergies,
        "medications": medications,
        "lab_results": labs,
        "radiology": radiology,
        "encounters": encounters
    }

def get_unified_patient_timeline(
    db: Session,
    patient: MasterPatient,
    org_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    is_emergency: bool = False
) -> List[Dict[str, Any]]:
    """
    Builds a unified chronological event stream with filtering capabilities.
    """
    chart = get_unified_patient_chart(db, patient, is_emergency=is_emergency)
    timeline: List[Dict[str, Any]] = []

    # Format Diagnoses
    for d in chart["diagnoses"]:
        timeline.append({
            "event_id": f"diag-{d['id']}",
            "category": "DIAGNOSIS",
            "title": d["description"],
            "subtitle": f"ICD-10: {d['icd10_code'] or 'Unspecified'} | Status: {d['clinical_status']}",
            "event_date": d["provenance"]["recorded_at"],
            "organization_code": d["provenance"]["organization_code"],
            "organization_name": d["provenance"]["organization_name"],
            "severity_or_flag": d["severity"],
            "status": d["clinical_status"],
            "details": d
        })

    # Format Allergies
    for a in chart["allergies"]:
        timeline.append({
            "event_id": f"allergy-{a['id']}",
            "category": "ALLERGY",
            "title": f"Allergen: {a['allergen']}",
            "subtitle": f"Reaction: {a['reaction'] or 'Unspecified'}",
            "event_date": a["provenance"]["recorded_at"],
            "organization_code": a["provenance"]["organization_code"],
            "organization_name": a["provenance"]["organization_name"],
            "severity_or_flag": a["severity"],
            "status": a["verification_status"],
            "details": a
        })

    # Format Medications
    for m in chart["medications"]:
        timeline.append({
            "event_id": f"med-{m['id']}",
            "category": "MEDICATION",
            "title": m["medication_name"],
            "subtitle": f"Dose: {m['dosage']} | Freq: {m['frequency'] or 'Standard'}",
            "event_date": m["provenance"]["recorded_at"],
            "organization_code": m["provenance"]["organization_code"],
            "organization_name": m["provenance"]["organization_name"],
            "severity_or_flag": "NORMAL",
            "status": m["status"],
            "details": m
        })

    # Format Labs
    for l in chart["lab_results"]:
        timeline.append({
            "event_id": f"lab-{l['id']}",
            "category": "LAB_RESULT",
            "title": l["test_name"],
            "subtitle": f"Result: {l['result_value']} {l['unit'] or ''} (Ref: {l['reference_range'] or 'N/A'})",
            "event_date": l["test_date"],
            "organization_code": l["provenance"]["organization_code"],
            "organization_name": l["provenance"]["organization_name"],
            "severity_or_flag": l["flag"],
            "status": l["status"],
            "details": l
        })

    # Format Radiology
    for r in chart["radiology"]:
        timeline.append({
            "event_id": f"rad-{r['id']}",
            "category": "RADIOLOGY",
            "title": f"Imaging: {r['study_type']}",
            "subtitle": f"Modality: {r['modality']} | Region: {r['body_region']} | {r['status']}",
            "event_date": r["study_date"],
            "organization_code": r["provenance"]["organization_code"],
            "organization_name": r["provenance"]["organization_name"],
            "severity_or_flag": "NORMAL",
            "status": r["status"],
            "details": r
        })

    # Format Encounters
    for e in chart["encounters"]:
        timeline.append({
            "event_id": f"enc-{e['id']}",
            "category": "ENCOUNTER",
            "title": f"{e['encounter_type']} Encounter - {e['department'] or 'General'}",
            "subtitle": f"Reason: {e['reason'] or 'Consultation'} | Provider: {e['provider_name'] or 'Staff'}",
            "event_date": e["encounter_date"],
            "organization_code": e["provenance"]["organization_code"],
            "organization_name": e["provenance"]["organization_name"],
            "severity_or_flag": "NORMAL",
            "status": "COMPLETED",
            "details": e
        })

    # Sort descending by date
    timeline.sort(key=lambda x: x["event_date"], reverse=True)

    # Apply filters
    if org_filter and org_filter.upper() != "ALL":
        timeline = [item for item in timeline if item["organization_code"].upper() == org_filter.upper()]

    if category_filter and category_filter.upper() != "ALL":
        timeline = [item for item in timeline if item["category"].upper() == category_filter.upper()]

    return timeline
