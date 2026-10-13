from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, Doctor, DoctorPatientAssignment
from app.models.patient import MasterPatient
from app.models.opd import OpdEncounter
from app.models.clinical import ClinicalDiagnosis, ClinicalEncounter
from app.models.appointment import Appointment
from app.schemas.doctor import DoctorProfileResponse
from app.security import get_current_active_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/doctor", tags=["Doctor Workspace & Consultations"])

class PatientSearchCandidate(BaseModel):
    id: int
    national_health_id: str
    first_name: str
    last_name: str
    dob: str
    gender: str
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    is_assigned: bool
    active_encounter_token: Optional[str] = None
    total_encounters: int

class ConsultationCompleteRequest(BaseModel):
    encounter_id: int
    clinical_notes: str
    primary_diagnosis: Optional[str] = None
    icd10_code: Optional[str] = None
    severity: Optional[str] = "MODERATE"
    follow_up_days: Optional[int] = 14
    follow_up_reason: Optional[str] = "Treatment response monitoring"

@router.get("/profile", response_model=DoctorProfileResponse)
def get_my_doctor_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns the professional credentials and NMR verification status of current doctor.
    """
    if current_user.role != "doctor" or not current_user.doctor_profile:
        raise HTTPException(status_code=403, detail="Current user does not have a doctor profile.")

    doc = current_user.doctor_profile
    return DoctorProfileResponse(
        id=doc.id,
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        department=doc.department,
        license_number=doc.license_number,
        specialty=doc.specialty,
        additional_specialties=doc.additional_specialties,
        verification_status=doc.verification_status,
        qualifications=doc.qualifications,
        institution=doc.institution,
        graduation_year=doc.graduation_year,
        experience_years=doc.experience_years,
        hospital=doc.hospital,
        biography=doc.biography,
        profile_photo_url=doc.profile_photo_url,
        languages_spoken=doc.languages_spoken,
        consultation_fee=doc.consultation_fee,
        consultation_types=doc.consultation_types,
        city=doc.city,
        clinic_address=doc.clinic_address,
    )

@router.get("/all-profiles", response_model=List[DoctorProfileResponse])
def get_all_doctor_profiles(
    db: Session = Depends(get_db)
):
    """
    Public / Patient visible list of hospital doctors with verified status.
    """
    doctors = db.query(Doctor).all()
    results = []
    for d in doctors:
        u = d.user
        results.append(DoctorProfileResponse(
            id=d.id,
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            department=d.department,
            license_number=d.license_number,
            specialty=d.specialty,
            additional_specialties=d.additional_specialties,
            verification_status=d.verification_status,
            qualifications=d.qualifications,
            institution=d.institution,
            graduation_year=d.graduation_year,
            experience_years=d.experience_years,
            hospital=d.hospital,
            biography=d.biography,
            profile_photo_url=d.profile_photo_url,
            languages_spoken=d.languages_spoken,
            consultation_fee=d.consultation_fee,
            consultation_types=d.consultation_types,
            city=d.city,
            clinic_address=d.clinic_address,
        ))
    return results

@router.get("/search-patients", response_model=List[PatientSearchCandidate])
def search_patients_safe(
    q: str = Query(..., min_length=1, description="Search query by name, ABHA ID, or phone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Prominent clinician search with anti-false-merge candidate safety.
    When searching 'Neha', returns both matching patients with distinguishing demographics
    (ABHA ID, DOB, phone, address) so the clinician explicitly chooses the correct identity.
    """
    if current_user.role not in ["doctor", "admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Unauthorized to search clinical patient records.")

    search_term = f"%{q.strip()}%"
    patients = db.query(MasterPatient).filter(
        or_(
            MasterPatient.first_name.ilike(search_term),
            MasterPatient.last_name.ilike(search_term),
            MasterPatient.national_health_id.ilike(search_term),
            MasterPatient.phone.ilike(search_term)
        )
    ).limit(20).all()

    candidates = []
    doc_id = current_user.doctor_profile.id if current_user.doctor_profile else None

    for p in patients:
        is_assigned = False
        if doc_id:
            assign = db.query(DoctorPatientAssignment).filter(
                DoctorPatientAssignment.doctor_id == doc_id,
                DoctorPatientAssignment.patient_id == p.id,
                DoctorPatientAssignment.active == True
            ).first()
            is_assigned = assign is not None

        active_enc = db.query(OpdEncounter).filter(
            OpdEncounter.master_patient_id == p.id,
            OpdEncounter.status.in_(["REGISTERED", "CHECKED_IN", "WAITING", "WITH_DOCTOR"])
        ).order_by(OpdEncounter.arrival_time.desc()).first()

        enc_count = db.query(OpdEncounter).filter(OpdEncounter.master_patient_id == p.id).count()

        candidates.append(PatientSearchCandidate(
            id=p.id,
            national_health_id=p.national_health_id,
            first_name=p.first_name,
            last_name=p.last_name,
            dob=str(p.dob),
            gender=p.gender,
            phone=p.phone,
            blood_group=p.blood_group,
            address=p.address,
            is_assigned=is_assigned,
            active_encounter_token=active_enc.token_number if active_enc else None,
            total_encounters=enc_count
        ))

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="PATIENT_SEARCH_PERFORMED",
        target_resource="MasterPatient",
        details=f"Query '{q}' returned {len(candidates)} candidates",
        patient_id=None
    )

    return candidates

@router.post("/consultation/complete")
def complete_consultation(
    req: ConsultationCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Completes clinical consultation encounter:
    - Sets encounter status to CONSULTATION_COMPLETED.
    - Records clinical diagnosis and notes into unified EHR chart.
    - Automatically schedules follow-up appointment if requested.
    """
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Only doctors can complete clinical consultations.")

    enc = db.query(OpdEncounter).filter(OpdEncounter.id == req.encounter_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")

    enc.status = "CONSULTATION_COMPLETED"
    enc.consultation_end_time = datetime.utcnow()
    enc.clinical_notes = req.clinical_notes

    # Add diagnosis if supplied
    if req.primary_diagnosis:
        diag = ClinicalDiagnosis(
            master_patient_id=enc.master_patient_id,
            organization_id=enc.organization_id or 1,
            icd10_code=req.icd10_code or "Z00.00",
            description=req.primary_diagnosis,
            severity=req.severity or "MODERATE",
            clinical_status="ACTIVE",
            onset_date=date.today(),
            recorded_at=datetime.utcnow()
        )
        db.add(diag)

    # Schedule follow-up appointment if requested
    followup_appt = None
    if req.follow_up_days and req.follow_up_days > 0:
        target_date = date.today().fromordinal(date.today().toordinal() + req.follow_up_days)
        followup_appt = Appointment(
            master_patient_id=enc.master_patient_id,
            doctor_id=enc.doctor_id,
            appointment_date=target_date,
            appointment_time="10:00 AM",
            department=enc.department,
            reason=req.follow_up_reason or "Routine Post-Consultation Follow-up",
            status="SCHEDULED",
            notes=f"Auto-scheduled follow-up from OPD Encounter #{enc.token_number}",
            created_by_user_id=current_user.id
        )
        db.add(followup_appt)

    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="CONSULTATION_COMPLETED",
        target_resource=f"OpdEncounter:{enc.id}",
        details=f"Completed consultation for {enc.token_number}. Diagnosis: {req.primary_diagnosis}",
        patient_id=enc.master_patient_id
    )

    return {
        "status": "success",
        "encounter_id": enc.id,
        "token_number": enc.token_number,
        "message": "Consultation successfully completed and clinical records persisted.",
        "follow_up_appointment_date": str(followup_appt.appointment_date) if followup_appt else None
    }
