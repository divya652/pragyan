from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, Doctor
from app.models.patient import MasterPatient
from app.models.organization import HealthcareOrganization
from app.models.opd import OpdEncounter
from app.models.billing import Bill, BillItem
from app.models.notification import Notification
from app.schemas.opd import (
    OpdRegistrationRequest,
    OpdStatusUpdateRequest,
    OpdEncounterResponse
)
from app.security import get_current_active_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/opd", tags=["OPD Registration & Queue Management"])

@router.post("/register", response_model=OpdEncounterResponse)
def register_opd_encounter(
    req: OpdRegistrationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Registers a patient for OPD visit (Walk-in or Appointment).
    Generates queue token and creates initial consultation bill.
    Restricted to Receptionist, Cashier, and Admin roles.
    """
    if current_user.role not in ["receptionist", "admin", "cashier"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Front Desk Receptionists and Administrators can create OPD encounters."
        )

    patient = db.query(MasterPatient).filter(MasterPatient.id == req.master_patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    org = db.query(HealthcareOrganization).filter(HealthcareOrganization.code == "HOSP_A").first()
    if not org:
        org = db.query(HealthcareOrganization).first()

    # Generate sequential token number for today
    today_count = db.query(OpdEncounter).count()
    token_str = f"OPD-{100 + today_count + 1}"

    encounter = OpdEncounter(
        master_patient_id=patient.id,
        doctor_id=req.doctor_id,
        organization_id=org.id if org else 1,
        token_number=token_str,
        department=req.department,
        visit_type=req.visit_type,
        status="REGISTERED",
        arrival_time=datetime.utcnow(),
        vitals_bp=req.vitals_bp,
        vitals_pulse=req.vitals_pulse,
        vitals_temp=req.vitals_temp,
        vitals_spo2=req.vitals_spo2,
        chief_complaint=req.chief_complaint,
        created_by_user_id=current_user.id
    )
    db.add(encounter)
    db.flush()

    # Generate Consultation Bill (Configurable hospital billing rule)
    bill_num = f"INV-OPD-{encounter.id}-{int(datetime.utcnow().timestamp()) % 10000}"
    bill = Bill(
        bill_number=bill_num,
        master_patient_id=patient.id,
        encounter_id=encounter.id,
        bill_type="OPD_CONSULTATION",
        total_amount=req.consultation_fee,
        discount_amount=0.0,
        tax_amount=0.0,
        net_payable=req.consultation_fee,
        amount_paid=0.0,
        balance_due=req.consultation_fee,
        status="PENDING",
        notes=f"OPD Consultation charge for {req.department}",
        created_by_user_id=current_user.id
    )
    db.add(bill)
    db.flush()

    item = BillItem(
        bill_id=bill.id,
        item_description=f"OPD Specialist Consultation - {req.department}",
        unit_price=req.consultation_fee,
        quantity=1,
        total_price=req.consultation_fee
    )
    db.add(item)
    db.commit()
    db.refresh(encounter)

    # In-app notification for patient if linked
    if patient.linked_user_id:
        notif = Notification(
            user_id=patient.linked_user_id,
            title="OPD Registration Confirmed",
            message=f"You have been registered for {req.department}. Token #{token_str}.",
            category="APPOINTMENT"
        )
        db.add(notif)
        db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="OPD_REGISTRATION_CREATED",
        target_resource=f"OpdEncounter:{encounter.id}",
        details=f"Created OPD token {token_str} for patient {patient.national_health_id}",
        patient_id=patient.id
    )

    doc_name = f"Dr. {encounter.doctor.user.full_name}" if encounter.doctor and encounter.doctor.user else "Attending Duty Doctor"
    return OpdEncounterResponse(
        id=encounter.id,
        master_patient_id=patient.id,
        patient_name=f"{patient.first_name} {patient.last_name}",
        patient_national_id=patient.national_health_id,
        patient_gender=patient.gender,
        patient_dob=str(patient.dob),
        patient_phone=patient.phone,
        doctor_id=encounter.doctor_id,
        doctor_name=doc_name,
        department=encounter.department,
        token_number=encounter.token_number,
        visit_type=encounter.visit_type,
        status=encounter.status,
        arrival_time=encounter.arrival_time,
        vitals_bp=encounter.vitals_bp,
        vitals_pulse=encounter.vitals_pulse,
        vitals_temp=encounter.vitals_temp,
        vitals_spo2=encounter.vitals_spo2,
        chief_complaint=encounter.chief_complaint,
        clinical_notes=encounter.clinical_notes,
        bill_id=bill.id,
        bill_status=bill.status,
        created_at=encounter.created_at
    )

@router.get("/queue", response_model=List[OpdEncounterResponse])
def get_opd_queue(
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns live OPD queue with patient status.
    Accessible to Receptionist, Doctor, Cashier, and Admin.
    """
    query = db.query(OpdEncounter)
    if department:
        query = query.filter(OpdEncounter.department == department)
    if status_filter:
        query = query.filter(OpdEncounter.status == status_filter)
    else:
        # Default active queue: exclude completed / cancelled
        query = query.filter(OpdEncounter.status.in_(["REGISTERED", "CHECKED_IN", "WAITING", "WITH_DOCTOR"]))
    
    encounters = query.order_by(OpdEncounter.arrival_time.asc()).all()
    results = []
    for enc in encounters:
        p = enc.patient
        b = db.query(Bill).filter(Bill.encounter_id == enc.id).first()
        doc_name = f"Dr. {enc.doctor.user.full_name}" if enc.doctor and enc.doctor.user else "General OPD Pool"
        results.append(OpdEncounterResponse(
            id=enc.id,
            master_patient_id=p.id,
            patient_name=f"{p.first_name} {p.last_name}",
            patient_national_id=p.national_health_id,
            patient_gender=p.gender,
            patient_dob=str(p.dob),
            patient_phone=p.phone,
            doctor_id=enc.doctor_id,
            doctor_name=doc_name,
            department=enc.department,
            token_number=enc.token_number,
            visit_type=enc.visit_type,
            status=enc.status,
            arrival_time=enc.arrival_time,
            consultation_start_time=enc.consultation_start_time,
            consultation_end_time=enc.consultation_end_time,
            vitals_bp=enc.vitals_bp,
            vitals_pulse=enc.vitals_pulse,
            vitals_temp=enc.vitals_temp,
            vitals_spo2=enc.vitals_spo2,
            chief_complaint=enc.chief_complaint,
            clinical_notes=enc.clinical_notes,
            bill_id=b.id if b else None,
            bill_status=b.status if b else None,
            created_at=enc.created_at
        ))
    return results

@router.post("/encounters/{encounter_id}/status", response_model=OpdEncounterResponse)
def update_opd_status(
    encounter_id: int,
    req: OpdStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Updates OPD encounter status through the care journey:
    REGISTERED -> CHECKED_IN -> WAITING -> WITH_DOCTOR -> CONSULTATION_COMPLETED.
    """
    enc = db.query(OpdEncounter).filter(OpdEncounter.id == encounter_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")

    old_status = enc.status
    enc.status = req.status
    if req.status == "WITH_DOCTOR" and not enc.consultation_start_time:
        enc.consultation_start_time = datetime.utcnow()
    elif req.status == "CONSULTATION_COMPLETED":
        enc.consultation_end_time = datetime.utcnow()
    
    if req.clinical_notes:
        enc.clinical_notes = req.clinical_notes

    db.commit()
    db.refresh(enc)

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="OPD_STATUS_UPDATED",
        target_resource=f"OpdEncounter:{enc.id}",
        details=f"Status transitioned from {old_status} to {enc.status}",
        patient_id=enc.master_patient_id
    )

    p = enc.patient
    b = db.query(Bill).filter(Bill.encounter_id == enc.id).first()
    doc_name = f"Dr. {enc.doctor.user.full_name}" if enc.doctor and enc.doctor.user else "Attending Doctor"
    return OpdEncounterResponse(
        id=enc.id,
        master_patient_id=p.id,
        patient_name=f"{p.first_name} {p.last_name}",
        patient_national_id=p.national_health_id,
        patient_gender=p.gender,
        patient_dob=str(p.dob),
        patient_phone=p.phone,
        doctor_id=enc.doctor_id,
        doctor_name=doc_name,
        department=enc.department,
        token_number=enc.token_number,
        visit_type=enc.visit_type,
        status=enc.status,
        arrival_time=enc.arrival_time,
        consultation_start_time=enc.consultation_start_time,
        consultation_end_time=enc.consultation_end_time,
        vitals_bp=enc.vitals_bp,
        vitals_pulse=enc.vitals_pulse,
        vitals_temp=enc.vitals_temp,
        vitals_spo2=enc.vitals_spo2,
        chief_complaint=enc.chief_complaint,
        clinical_notes=enc.clinical_notes,
        bill_id=b.id if b else None,
        bill_status=b.status if b else None,
        created_at=enc.created_at
    )

@router.get("/encounters/{encounter_id}/slip")
def get_registration_slip(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns registration slip data for printing / queue display.
    """
    enc = db.query(OpdEncounter).filter(OpdEncounter.id == encounter_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")

    p = enc.patient
    b = db.query(Bill).filter(Bill.encounter_id == enc.id).first()
    doc_name = f"Dr. {enc.doctor.user.full_name}" if enc.doctor and enc.doctor.user else "On-Duty Consultant"
    return {
        "slip_type": "OPD_REGISTRATION_AND_TOKEN_SLIP",
        "hospital_name": "Metro General Hospital & Research Institute",
        "token_number": enc.token_number,
        "encounter_id": enc.id,
        "date_time": enc.arrival_time.strftime("%d-%b-%Y %I:%M %p"),
        "patient": {
            "name": f"{p.first_name} {p.last_name}",
            "national_health_id": p.national_health_id,
            "dob": str(p.dob),
            "gender": p.gender,
            "phone": p.phone,
            "blood_group": p.blood_group
        },
        "department": enc.department,
        "doctor": doc_name,
        "visit_type": enc.visit_type,
        "vitals": {
            "bp": enc.vitals_bp,
            "pulse": enc.vitals_pulse,
            "temp": enc.vitals_temp,
            "spo2": enc.vitals_spo2
        },
        "chief_complaint": enc.chief_complaint,
        "billing": {
            "bill_number": b.bill_number if b else "N/A",
            "amount": b.net_payable if b else 0.0,
            "status": b.status if b else "UNBILLED"
        }
    }
