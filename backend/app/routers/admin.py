from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, Doctor
from app.models.patient import MasterPatient, SourcePatientRecord, IdentityMatchCandidate
from app.models.conflict import DataConflict
from app.models.appointment import Appointment
from app.models.audit import AuditLog
from app.schemas.auth import UserCreate, UserResponse, UserStatusUpdate
from app.schemas.audit import AuditLogResponse
from app.security import require_roles, hash_password
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/admin", tags=["System Administration & Audit Forensics"])

@router.get("/users", response_model=List[UserResponse])
def get_system_users(
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Lists all user accounts and roles."""
    return db.query(User).order_by(User.id.asc()).all()

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_system_user(
    user_in: UserCreate,
    request: Request,
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Admin creates a new user account with approved role."""
    existing = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered."
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    if user_in.role == "doctor":
        doc = Doctor(
            user_id=new_user.id,
            department=user_in.department or "General Medicine",
            license_number=user_in.license_number or f"LIC-{new_user.id:04d}",
            specialty=user_in.specialty or "Internal Medicine"
        )
        db.add(doc)

    db.commit()
    db.refresh(new_user)

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="CREATE_USER_ACCOUNT",
        resource_type="USER",
        resource_id=str(new_user.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"username": new_user.username, "role": new_user.role}
    )

    return new_user

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    request: Request,
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Admin activates or deactivates a user account."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own administrator account.")

    target_user.is_active = status_in.is_active
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="UPDATE_USER_STATUS",
        resource_type="USER",
        resource_id=str(user_id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"is_active": status_in.is_active}
    )

    return {"message": "User status updated successfully.", "user_id": user_id, "is_active": target_user.is_active}

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_security_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    actor_role: Optional[str] = Query(None, description="Filter by role"),
    outcome: Optional[str] = Query(None, description="Filter by SUCCESS or DENIED"),
    limit: int = 100,
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Searchable audit trail for security forensics, HIPAA/compliance oversight, and unauthorized attempt alerts.
    """
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if actor_role:
        q = q.filter(AuditLog.actor_role == actor_role)
    if outcome:
        q = q.filter(AuditLog.outcome == outcome.upper())

    logs = q.order_by(AuditLog.created_at.desc()).limit(limit).all()

    result = []
    for l in logs:
        result.append({
            "id": l.id,
            "actor_user_id": l.actor_user_id,
            "actor_username": l.actor.username if l.actor else "System / External",
            "actor_role": l.actor_role,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "outcome": l.outcome,
            "ip_address": l.ip_address,
            "details": l.details_json,
            "created_at": l.created_at
        })
    return result

from app.models.opd import OpdEncounter
from app.models.lab import LabOrder
from app.models.pharmacy import PrescriptionOrder, DispensingRecord
from app.models.billing import Bill, PaymentTransaction
from app.schemas.doctor import DoctorProfileResponse, DoctorVerificationRequest

@router.get("/doctors", response_model=List[DoctorProfileResponse])
def get_doctors_for_verification(
    status_filter: Optional[str] = None,
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Lists all doctors and their credential verification status for administrative review.
    """
    q = db.query(Doctor)
    if status_filter:
        q = q.filter(Doctor.verification_status == status_filter)
    docs = q.all()
    results = []
    for d in docs:
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
            profile_photo_url=d.profile_photo_url
        ))
    return results

@router.post("/doctors/{doctor_id}/verify")
def verify_doctor_credentials(
    doctor_id: int,
    req: DoctorVerificationRequest,
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin verifies or rejects a doctor's NMR license and qualifications.
    Doctors cannot self-assign verified status.
    """
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    doc.verification_status = req.status
    db.commit()

    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="DOCTOR_CREDENTIALS_VERIFIED",
        resource_type="DOCTOR",
        resource_id=str(doc.id),
        outcome="SUCCESS",
        details={"status": req.status, "license": doc.license_number, "notes": req.review_notes}
    )

    return {
        "status": "success",
        "doctor_id": doc.id,
        "verification_status": doc.verification_status,
        "message": f"Doctor credentials marked as {req.status}."
    }

@router.get("/stats")
def get_admin_dashboard_stats(
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Live aggregated operational statistics derived directly from persistent database tables.
    """
    users_count = db.query(User).count()
    patients_count = db.query(MasterPatient).count()
    appointments_count = db.query(Appointment).count()
    pending_matches = db.query(IdentityMatchCandidate).filter(IdentityMatchCandidate.status == "PENDING").count()
    open_conflicts = db.query(DataConflict).filter(DataConflict.resolution_status == "OPEN").count()
    unauthorized_attempts = db.query(AuditLog).filter(AuditLog.outcome == "DENIED").count()

    # Hospital Journey & Operations Stats
    opd_total = db.query(OpdEncounter).count()
    opd_waiting = db.query(OpdEncounter).filter(OpdEncounter.status.in_(["REGISTERED", "CHECKED_IN", "WAITING"])).count()
    opd_completed = db.query(OpdEncounter).filter(OpdEncounter.status == "CONSULTATION_COMPLETED").count()

    lab_total = db.query(LabOrder).count()
    lab_published = db.query(LabOrder).filter(LabOrder.status == "PUBLISHED").count()
    lab_pending = db.query(LabOrder).filter(LabOrder.status.in_(["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "AWAITING_VERIFICATION"])).count()

    rx_total = db.query(PrescriptionOrder).count()
    dispensed_records_count = db.query(DispensingRecord).count()

    # Billing & Financial Stats
    bills = db.query(Bill).all()
    total_invoiced = sum(b.net_payable for b in bills)
    total_collected = sum(b.amount_paid for b in bills)
    outstanding_balance = sum(b.balance_due for b in bills)
    paid_bills_count = sum(1 for b in bills if b.status == "PAID")
    pending_bills_count = sum(1 for b in bills if b.status in ["PENDING", "PARTIALLY_PAID"])

    doctors_verified = db.query(Doctor).filter(Doctor.verification_status == "VERIFIED").count()
    doctors_pending = db.query(Doctor).filter(Doctor.verification_status == "PENDING_VERIFICATION").count()

    return {
        "users_count": users_count,
        "patients_count": patients_count,
        "appointments_count": appointments_count,
        "pending_matches_count": pending_matches,
        "open_conflicts_count": open_conflicts,
        "unauthorized_attempts_count": unauthorized_attempts,
        "opd": {
            "total_encounters": opd_total,
            "waiting": opd_waiting,
            "completed": opd_completed
        },
        "laboratory": {
            "total_orders": lab_total,
            "published": lab_published,
            "pending": lab_pending
        },
        "pharmacy": {
            "total_prescriptions": rx_total,
            "dispensing_events": dispensed_records_count
        },
        "billing": {
            "total_invoiced": total_invoiced,
            "total_collected": total_collected,
            "outstanding_balance": outstanding_balance,
            "paid_bills_count": paid_bills_count,
            "pending_bills_count": pending_bills_count
        },
        "doctors": {
            "verified": doctors_verified,
            "pending_verification": doctors_pending
        }
    }

