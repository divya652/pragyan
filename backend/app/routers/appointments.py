from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime

from app.database import get_db
from app.models.user import User, Doctor
from app.models.patient import MasterPatient
from app.models.appointment import Appointment
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdateStatus,
    AppointmentResponse
)
from app.security import get_current_user, require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/appointments", tags=["Appointments & Scheduling"])

@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    appt_date: Optional[date] = None,
    doctor_id: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists appointments filtered by date and doctor.
    """
    q = db.query(Appointment)
    if appt_date:
        q = q.filter(Appointment.appointment_date == appt_date)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)

    # If user is a patient, only show their own appointments
    if user.role == "patient" and user.patient_profile:
        q = q.filter(Appointment.master_patient_id == user.patient_profile.id)

    appts = q.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.asc()).all()

    result = []
    for a in appts:
        result.append({
            "id": a.id,
            "master_patient_id": a.master_patient_id,
            "patient_name": f"{a.patient.first_name} {a.patient.last_name}" if a.patient else "Unknown",
            "patient_national_id": a.patient.national_health_id if a.patient else "N/A",
            "patient_phone": a.patient.phone if a.patient else None,
            "doctor_id": a.doctor_id,
            "doctor_name": a.doctor.user.full_name if a.doctor and a.doctor.user else "Unassigned",
            "appointment_date": a.appointment_date,
            "appointment_time": a.appointment_time,
            "department": a.department,
            "reason": a.reason,
            "status": a.status,
            "notes": a.notes,
            "created_at": a.created_at
        })
    return result

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appt_in: AppointmentCreate,
    request: Request,
    user: User = Depends(require_roles(["receptionist", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Receptionist schedules a new appointment for a patient.
    """
    patient = db.query(MasterPatient).filter(MasterPatient.id == appt_in.master_patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    new_appt = Appointment(
        master_patient_id=appt_in.master_patient_id,
        doctor_id=appt_in.doctor_id,
        appointment_date=appt_in.appointment_date,
        appointment_time=appt_in.appointment_time,
        department=appt_in.department,
        reason=appt_in.reason,
        notes=appt_in.notes,
        status="SCHEDULED",
        created_by_user_id=user.id
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="SCHEDULE_APPOINTMENT",
        resource_type="APPOINTMENT",
        resource_id=str(new_appt.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"patient_id": patient.id, "date": str(appt_in.appointment_date), "time": appt_in.appointment_time}
    )

    return {
        "id": new_appt.id,
        "master_patient_id": new_appt.master_patient_id,
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "patient_national_id": patient.national_health_id,
        "patient_phone": patient.phone,
        "doctor_id": new_appt.doctor_id,
        "doctor_name": new_appt.doctor.user.full_name if new_appt.doctor and new_appt.doctor.user else "Unassigned",
        "appointment_date": new_appt.appointment_date,
        "appointment_time": new_appt.appointment_time,
        "department": new_appt.department,
        "reason": new_appt.reason,
        "status": new_appt.status,
        "notes": new_appt.notes,
        "created_at": new_appt.created_at
    }

@router.patch("/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    status_update: AppointmentUpdateStatus,
    request: Request,
    user: User = Depends(require_roles(["receptionist", "doctor", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Updates arrival status (e.g. CHECKED_IN, COMPLETED, CANCELLED).
    """
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    old_status = appt.status
    appt.status = status_update.status
    if status_update.notes:
        appt.notes = f"{appt.notes or ''}\n[Status update to {status_update.status}]: {status_update.notes}".strip()
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="UPDATE_APPOINTMENT_STATUS",
        resource_type="APPOINTMENT",
        resource_id=str(appointment_id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"old_status": old_status, "new_status": status_update.status}
    )

    return {"message": "Status updated successfully.", "appointment_id": appointment_id, "status": appt.status}
