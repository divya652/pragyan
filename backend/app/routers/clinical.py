from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, Doctor, DoctorPatientAssignment
from app.models.patient import MasterPatient
from app.models.clinical import ClinicalEncounter, ClinicalDiagnosis
from app.models.conflict import DataConflict
from app.schemas.clinical import (
    UnifiedChartResponse,
    TimelineEvent,
    EncounterCreate,
    EncounterItem,
    BreakGlassRequest
)
from app.schemas.conflict import ConflictResponse, ConflictResolveRequest
from app.security import get_current_user, verify_clinical_access
from app.services.unified_chart_service import (
    get_unified_patient_chart,
    get_unified_patient_timeline
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/clinical", tags=["Clinician & Unified Health Chart"])

@router.get("/assigned-patients")
def get_authorized_patients_for_doctor(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns only patients where the clinician has an active treatment assignment.
    Prevents doctors from browsing unrestricted patients outside their care scope.
    """
    client_ip = request.client.host if request.client else "unknown"

    if user.role != "doctor":
        log_audit_event(
            db=db,
            actor_user_id=user.id,
            actor_role=user.role,
            action="UNAUTHORIZED_DOCTOR_PATIENT_LIST_ACCESS",
            resource_type="PATIENT_LIST",
            resource_id=None,
            outcome="DENIED",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only clinical doctors can view assigned patient care lists."
        )

    doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Doctor profile not found.")

    assignments = db.query(DoctorPatientAssignment).filter(
        DoctorPatientAssignment.doctor_id == doctor.id,
        DoctorPatientAssignment.active == True
    ).all()

    patient_ids = [a.patient_id for a in assignments]
    patients = db.query(MasterPatient).filter(MasterPatient.id.in_(patient_ids)).all()

    result = []
    for p in patients:
        conflicts_count = db.query(DataConflict).filter(
            DataConflict.master_patient_id == p.id,
            DataConflict.resolution_status == "OPEN"
        ).count()
        result.append({
            "id": p.id,
            "national_health_id": p.national_health_id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "dob": p.dob,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "phone": p.phone,
            "open_conflicts_count": conflicts_count
        })

    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="VIEW_ASSIGNED_PATIENTS_LIST",
        resource_type="PATIENT_LIST",
        resource_id=str(doctor.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"assigned_count": len(result)}
    )

    return result

@router.get("/patients/{patient_id}/chart", response_model=UnifiedChartResponse)
def get_unified_chart(
    patient_id: int,
    request: Request,
    is_emergency: bool = Query(False, description="Emergency treatment override flag"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the consolidated, multi-hospital Unified Clinical Patient Chart.
    Strictly verifies clinical role and patient-level treatment authorization.
    Rejects receptionists and unassigned accounts with 403 Forbidden.
    """
    patient = verify_clinical_access(patient_id=patient_id, user=user, db=db, request=request)
    client_ip = request.client.host if request.client else "unknown"

    # Check if doctor has emergency break-glass assignment
    has_emergency_override = False
    doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
    if doctor:
        assign = db.query(DoctorPatientAssignment).filter(
            DoctorPatientAssignment.doctor_id == doctor.id,
            DoctorPatientAssignment.patient_id == patient_id,
            DoctorPatientAssignment.active == True
        ).first()
        if assign and assign.is_emergency_override:
            has_emergency_override = True

    effective_emergency = is_emergency or has_emergency_override
    chart_data = get_unified_patient_chart(db=db, patient=patient, is_emergency=effective_emergency)

    if has_emergency_override:
        chart_data["is_emergency_override"] = True

    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="VIEW_UNIFIED_CLINICAL_CHART",
        resource_type="CLINICAL_RECORD",
        resource_id=str(patient_id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={
            "national_health_id": patient.national_health_id,
            "contributing_sources": chart_data["contributing_sources"],
            "conflicts_count": chart_data["active_conflicts_count"],
            "is_emergency": effective_emergency,
            "is_emergency_override": chart_data.get("is_emergency_override", False)
        }
    )

    return chart_data

@router.post("/break-glass-access")
def request_break_glass_access(
    break_glass: BreakGlassRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Emergency Break-Glass workflow for unassigned clinicians requiring immediate life-safety PHI access.
    Produces high-severity audit logging and creates an audited temporary emergency treatment assignment.
    """
    if user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only licensed physicians may invoke emergency break-glass protocols."
        )

    if not break_glass.clinical_attestation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attestation required: Clinician must legally certify this is an urgent emergency."
        )

    if len(break_glass.emergency_reason.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Emergency justification must provide clinically substantive rationale (min 10 characters)."
        )

    patient = db.query(MasterPatient).filter(MasterPatient.id == break_glass.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Doctor profile not found.")

    # Check if assignment already exists
    assignment = db.query(DoctorPatientAssignment).filter(
        DoctorPatientAssignment.doctor_id == doctor.id,
        DoctorPatientAssignment.patient_id == patient.id
    ).first()

    if assignment:
        assignment.active = True
        assignment.relationship_type = "EMERGENCY_OVERRIDE"
        assignment.is_emergency_override = True
    else:
        assignment = DoctorPatientAssignment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            relationship_type="EMERGENCY_OVERRIDE",
            is_emergency_override=True,
            active=True
        )
        db.add(assignment)

    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="EMERGENCY_BREAK_GLASS_ACCESS_GRANTED",
        resource_type="CLINICAL_RECORD",
        resource_id=str(patient.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={
            "doctor_name": user.full_name,
            "license_number": doctor.license_number,
            "patient_national_id": patient.national_health_id,
            "emergency_reason": break_glass.emergency_reason,
            "legal_attestation": True
        }
    )

    return {
        "status": "GRANTED",
        "message": f"Emergency Break-Glass treatment access authorized for patient {patient.first_name} {patient.last_name}.",
        "patient_id": patient.id,
        "is_emergency_override": True
    }


@router.get("/patients/{patient_id}/timeline", response_model=List[TimelineEvent])
def get_unified_timeline(
    patient_id: int,
    request: Request,
    org: Optional[str] = Query("ALL", description="Filter by healthcare facility code, e.g. HOSP_A, HOSP_B"),
    category: Optional[str] = Query("ALL", description="Filter by category: ENCOUNTER, DIAGNOSIS, MEDICATION, ALLERGY, LAB_RESULT"),
    is_emergency: bool = Query(False, description="Emergency override"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chronological longitudinal timeline across all contributing healthcare organizations.
    """
    patient = verify_clinical_access(patient_id=patient_id, user=user, db=db, request=request)
    client_ip = request.client.host if request.client else "unknown"

    has_emergency_override = False
    doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
    if doctor:
        assign = db.query(DoctorPatientAssignment).filter(
            DoctorPatientAssignment.doctor_id == doctor.id,
            DoctorPatientAssignment.patient_id == patient_id,
            DoctorPatientAssignment.active == True
        ).first()
        if assign and assign.is_emergency_override:
            has_emergency_override = True

    effective_emergency = is_emergency or has_emergency_override

    timeline_events = get_unified_patient_timeline(
        db=db,
        patient=patient,
        org_filter=org,
        category_filter=category,
        is_emergency=effective_emergency
    )

    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="VIEW_CHRONOLOGICAL_TIMELINE",
        resource_type="CLINICAL_RECORD",
        resource_id=str(patient_id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"events_returned": len(timeline_events), "org_filter": org, "category_filter": category}
    )

    return timeline_events

@router.get("/patients/{patient_id}/conflicts", response_model=List[ConflictResponse])
def get_patient_conflicts(
    patient_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists detected discrepancies and conflicts across source healthcare organizations.
    """
    patient = verify_clinical_access(patient_id=patient_id, user=user, db=db, request=request)

    conflicts = db.query(DataConflict).filter(
        DataConflict.master_patient_id == patient_id
    ).order_by(DataConflict.created_at.desc()).all()

    result = []
    for c in conflicts:
        result.append({
            "id": c.id,
            "master_patient_id": c.master_patient_id,
            "conflict_category": c.conflict_category,
            "field_name": c.field_name,
            "source_a_org_id": c.source_a_org_id,
            "source_a_org_code": c.source_a_org.code if c.source_a_org else "ORG_A",
            "source_a_org_name": c.source_a_org.name if c.source_a_org else "Facility A",
            "source_a_value": c.source_a_value,
            "source_a_timestamp": c.source_a_timestamp,
            "source_b_org_id": c.source_b_org_id,
            "source_b_org_code": c.source_b_org.code if c.source_b_org else "ORG_B",
            "source_b_org_name": c.source_b_org.name if c.source_b_org else "Facility B",
            "source_b_value": c.source_b_value,
            "source_b_timestamp": c.source_b_timestamp,
            "resolution_status": c.resolution_status,
            "resolution_notes": c.resolution_notes,
            "resolved_by_name": c.resolved_by.full_name if c.resolved_by else None,
            "resolved_at": c.resolved_at,
            "created_at": c.created_at
        })

    return result

@router.post("/conflicts/{conflict_id}/resolve")
def resolve_data_conflict(
    conflict_id: int,
    resolve_in: ConflictResolveRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clinician resolves a conflict with medical justification.
    Never overwrites original records; logs resolution decisions with clinician attribution.
    """
    conflict = db.query(DataConflict).filter(DataConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict record not found.")

    # Verify doctor scope for the patient
    verify_clinical_access(patient_id=conflict.master_patient_id, user=user, db=db, request=request)

    conflict.resolution_status = "RESOLVED"
    conflict.resolution_notes = resolve_in.resolution_notes
    conflict.resolved_by_user_id = user.id
    conflict.resolved_at = datetime.utcnow()
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="RESOLVE_DATA_CONFLICT",
        resource_type="DATA_CONFLICT",
        resource_id=str(conflict_id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"notes": resolve_in.resolution_notes, "category": conflict.conflict_category}
    )

    return {"message": "Conflict resolved successfully.", "conflict_id": conflict.id}

@router.post("/patients/{patient_id}/encounters", status_code=status.HTTP_201_CREATED)
def record_clinical_encounter(
    patient_id: int,
    enc_in: EncounterCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enables authorized clinicians to add a new clinical encounter and diagnoses.
    """
    patient = verify_clinical_access(patient_id=patient_id, user=user, db=db, request=request)
    client_ip = request.client.host if request.client else "unknown"

    # Default to Hospital A (or primary facility)
    new_enc = ClinicalEncounter(
        master_patient_id=patient.id,
        organization_id=1,  # Primary attending facility
        source_encounter_id=f"LOCAL-ENC-{int(datetime.utcnow().timestamp())}",
        encounter_type=enc_in.encounter_type,
        reason=enc_in.reason,
        provider_name=user.full_name,
        encounter_date=enc_in.encounter_date,
        department=enc_in.department,
        clinical_notes=enc_in.clinical_notes
    )
    db.add(new_enc)
    db.flush()

    for diag in enc_in.diagnoses or []:
        cd = ClinicalDiagnosis(
            master_patient_id=patient.id,
            organization_id=1,
            encounter_id=new_enc.id,
            icd10_code=diag.get("icd10_code", "R69"),
            description=diag.get("description", "Diagnosed condition"),
            severity=diag.get("severity", "MODERATE"),
            clinical_status="ACTIVE",
            onset_date=enc_in.encounter_date.date(),
            recorded_at=datetime.utcnow()
        )
        db.add(cd)

    db.commit()

    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="CREATE_CLINICAL_ENCOUNTER",
        resource_type="CLINICAL_ENCOUNTER",
        resource_id=str(new_enc.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"reason": enc_in.reason, "diagnoses_count": len(enc_in.diagnoses or [])}
    )

    return {"message": "Clinical encounter recorded successfully.", "encounter_id": new_enc.id}
