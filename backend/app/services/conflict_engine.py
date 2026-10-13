import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.patient import MasterPatient, SourcePatientRecord
from app.models.clinical import ClinicalAllergy, ClinicalMedication
from app.models.conflict import DataConflict

def detect_and_record_conflicts(db: Session, master_patient_id: int):
    """
    Examines all linked source records and clinical data for master_patient_id
    and registers discrepancies into the data_conflicts table.
    Preserves all original source records without overwriting.
    """
    source_records = db.query(SourcePatientRecord).filter(
        SourcePatientRecord.master_patient_id == master_patient_id,
        SourcePatientRecord.match_status == "MATCHED"
    ).all()

    if len(source_records) < 2:
        return  # Need at least two sources to have a cross-system discrepancy

    # 1. Demographic Conflicts Check
    parsed_demos = []
    for sr in source_records:
        try:
            demo = json.loads(sr.raw_demographics_json)
            parsed_demos.append((sr.organization_id, sr.ingested_at, demo))
        except Exception:
            continue

    # Check pairwise discrepancies across sources
    for i in range(len(parsed_demos)):
        for j in range(i + 1, len(parsed_demos)):
            org_a_id, time_a, demo_a = parsed_demos[i]
            org_b_id, time_b, demo_b = parsed_demos[j]

            if org_a_id == org_b_id:
                continue

            # A. Phone number discrepancy
            phone_a = demo_a.get("phone")
            phone_b = demo_b.get("phone")
            if phone_a and phone_b and phone_a.strip() != phone_b.strip():
                _create_conflict_if_absent(
                    db=db,
                    master_patient_id=master_patient_id,
                    category="DEMOGRAPHIC_PHONE",
                    field_name="Contact Telephone Number",
                    org_a_id=org_a_id, val_a=phone_a, time_a=time_a,
                    org_b_id=org_b_id, val_b=phone_b, time_b=time_b
                )

            # B. Blood group discrepancy
            bg_a = demo_a.get("blood_group")
            bg_b = demo_b.get("blood_group")
            if bg_a and bg_b and bg_a.strip().upper() != bg_b.strip().upper():
                _create_conflict_if_absent(
                    db=db,
                    master_patient_id=master_patient_id,
                    category="DEMOGRAPHIC_BLOOD_GROUP",
                    field_name="ABO / Rh Blood Group",
                    org_a_id=org_a_id, val_a=bg_a, time_a=time_a,
                    org_b_id=org_b_id, val_b=bg_b, time_b=time_b
                )

    # 2. Clinical Allergy Discrepancies
    allergies = db.query(ClinicalAllergy).filter(
        ClinicalAllergy.master_patient_id == master_patient_id
    ).all()

    allergen_map = {}
    for alg in allergies:
        key = alg.allergen.strip().lower()
        allergen_map.setdefault(key, []).append(alg)

    for allergen_name, alg_list in allergen_map.items():
        if len(alg_list) > 1:
            for i in range(len(alg_list)):
                for j in range(i + 1, len(alg_list)):
                    a1 = alg_list[i]
                    a2 = alg_list[j]
                    if a1.organization_id != a2.organization_id:
                        # Check severity or reaction divergence
                        if a1.severity != a2.severity or a1.reaction != a2.reaction or a1.verification_status != a2.verification_status:
                            val_1 = f"Severity: {a1.severity}, Reaction: {a1.reaction or 'Unspecified'}, Status: {a1.verification_status}"
                            val_2 = f"Severity: {a2.severity}, Reaction: {a2.reaction or 'Unspecified'}, Status: {a2.verification_status}"
                            _create_conflict_if_absent(
                                db=db,
                                master_patient_id=master_patient_id,
                                category="CLINICAL_ALLERGY",
                                field_name=f"Allergy Record: {a1.allergen}",
                                org_a_id=a1.organization_id, val_a=val_1, time_a=a1.recorded_at,
                                org_b_id=a2.organization_id, val_b=val_2, time_b=a2.recorded_at
                            )

    # 3. Clinical Medication Discrepancies (Active dosage conflicts)
    meds = db.query(ClinicalMedication).filter(
        ClinicalMedication.master_patient_id == master_patient_id,
        ClinicalMedication.status == "ACTIVE"
    ).all()

    med_map = {}
    for m in meds:
        key = m.medication_name.strip().lower()
        med_map.setdefault(key, []).append(m)

    for med_name, m_list in med_map.items():
        if len(m_list) > 1:
            for i in range(len(m_list)):
                for j in range(i + 1, len(m_list)):
                    m1 = m_list[i]
                    m2 = m_list[j]
                    if m1.organization_id != m2.organization_id:
                        if m1.dosage != m2.dosage or m1.frequency != m2.frequency:
                            val_1 = f"Dosage: {m1.dosage}, Frequency: {m1.frequency or 'Standard'}"
                            val_2 = f"Dosage: {m2.dosage}, Frequency: {m2.frequency or 'Standard'}"
                            _create_conflict_if_absent(
                                db=db,
                                master_patient_id=master_patient_id,
                                category="CLINICAL_MEDICATION",
                                field_name=f"Active Prescription: {m1.medication_name}",
                                org_a_id=m1.organization_id, val_a=val_1, time_a=m1.recorded_at,
                                org_b_id=m2.organization_id, val_b=val_2, time_b=m2.recorded_at
                            )

def _create_conflict_if_absent(
    db: Session,
    master_patient_id: int,
    category: str,
    field_name: str,
    org_a_id: int, val_a: str, time_a: datetime,
    org_b_id: int, val_b: str, time_b: datetime
):
    existing = db.query(DataConflict).filter(
        DataConflict.master_patient_id == master_patient_id,
        DataConflict.conflict_category == category,
        DataConflict.field_name == field_name,
        DataConflict.resolution_status == "OPEN"
    ).first()

    if not existing:
        conflict = DataConflict(
            master_patient_id=master_patient_id,
            conflict_category=category,
            field_name=field_name,
            source_a_org_id=org_a_id,
            source_a_value=val_a,
            source_a_timestamp=time_a,
            source_b_org_id=org_b_id,
            source_b_value=val_b,
            source_b_timestamp=time_b,
            resolution_status="OPEN"
        )
        db.add(conflict)
        db.commit()
