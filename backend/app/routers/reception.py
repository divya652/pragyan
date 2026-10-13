from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.patient import MasterPatient
from app.schemas.patient import PatientCreate, PatientUpdate, PatientDemographicsResponse
from app.security import require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/reception", tags=["Reception & Registration"])

@router.get("/patients", response_model=List[PatientDemographicsResponse])
def search_administrative_patients(
    query: Optional[str] = Query(None, description="Search by name, National Health ID, or phone"),
    limit: int = 50,
    request: Request = None,
    user: User = Depends(require_roles(["receptionist", "admin", "doctor"])),
    db: Session = Depends(get_db)
):
    """
    Administrative patient registry search.
    Strictly returns demographic fields only: NO clinical diagnoses, allergies, or medications.
    """
    q = db.query(MasterPatient)
    if query:
        pattern = f"%{query}%"
        q = q.filter(
            (MasterPatient.first_name.ilike(pattern)) |
            (MasterPatient.last_name.ilike(pattern)) |
            (MasterPatient.national_health_id.ilike(pattern)) |
            (MasterPatient.phone.ilike(pattern))
        )
    
    patients = q.order_by(MasterPatient.created_at.desc()).limit(limit).all()

    client_ip = request.client.host if request and request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="SEARCH_ADMIN_PATIENT_REGISTRY",
        resource_type="PATIENT_REGISTRY",
        resource_id=query or "ALL",
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"result_count": len(patients)}
    )

    return patients

@router.post("/patients", response_model=PatientDemographicsResponse, status_code=status.HTTP_201_CREATED)
def register_new_patient(
    patient_in: PatientCreate,
    request: Request,
    user: User = Depends(require_roles(["receptionist", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Intake registration for new patients by receptionist.
    Assigns National Health ID and persists demographic details.
    """
    # Check if National Health ID is already in use
    existing = db.query(MasterPatient).filter(
        MasterPatient.national_health_id == patient_in.national_health_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with National Health ID '{patient_in.national_health_id}' is already registered."
        )

    new_patient = MasterPatient(
        national_health_id=patient_in.national_health_id,
        first_name=patient_in.first_name,
        last_name=patient_in.last_name,
        dob=patient_in.dob,
        gender=patient_in.gender.upper(),
        blood_group=patient_in.blood_group,
        phone=patient_in.phone,
        email=patient_in.email,
        address=patient_in.address,
        emergency_contact_name=patient_in.emergency_contact_name,
        emergency_contact_phone=patient_in.emergency_contact_phone
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="REGISTER_PATIENT_DEMOGRAPHICS",
        resource_type="PATIENT",
        resource_id=str(new_patient.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"national_health_id": new_patient.national_health_id, "name": f"{new_patient.first_name} {new_patient.last_name}"}
    )

    return new_patient

@router.get("/patients/{patient_id}", response_model=PatientDemographicsResponse)
def get_patient_demographics(
    patient_id: int,
    request: Request,
    user: User = Depends(require_roles(["receptionist", "admin", "doctor"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves administrative demographic profile only.
    """
    patient = db.query(MasterPatient).filter(MasterPatient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found.")

    return patient

@router.put("/patients/{patient_id}", response_model=PatientDemographicsResponse)
def update_patient_contact_info(
    patient_id: int,
    update_in: PatientUpdate,
    request: Request,
    user: User = Depends(require_roles(["receptionist", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Allows receptionist to correct administrative contact details (phone, address, emergency contact).
    """
    patient = db.query(MasterPatient).filter(MasterPatient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found.")

    if update_in.phone is not None:
        patient.phone = update_in.phone
    if update_in.email is not None:
        patient.email = update_in.email
    if update_in.address is not None:
        patient.address = update_in.address
    if update_in.emergency_contact_name is not None:
        patient.emergency_contact_name = update_in.emergency_contact_name
    if update_in.emergency_contact_phone is not None:
        patient.emergency_contact_phone = update_in.emergency_contact_phone

    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="UPDATE_PATIENT_CONTACT_INFO",
        resource_type="PATIENT",
        resource_id=str(patient.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"updated_fields": update_in.dict(exclude_unset=True)}
    )

    return patient
