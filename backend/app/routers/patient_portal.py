from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.models.user import User
from app.models.patient import MasterPatient
from app.models.consent import PatientConsent
from app.models.audit import AuditLog
from app.schemas.clinical import UnifiedChartResponse
from app.schemas.consent import ConsentResponse, ConsentCreate
from app.security import get_current_user, require_roles
from app.services.unified_chart_service import get_unified_patient_chart
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/patient-portal", tags=["Patient Portal & Consent Management"])

def get_linked_patient_for_user(user: User, db: Session) -> MasterPatient:
    if user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Patient Portal is reserved for patient accounts."
        )
    patient = db.query(MasterPatient).filter(MasterPatient.linked_user_id == user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No patient medical profile linked to your user account."
        )
    return patient

@router.get("/my-records", response_model=UnifiedChartResponse)
def get_my_medical_records(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the logged-in patient's own consolidated medical records.
    Never exposes other patients' PHI.
    """
    patient = get_linked_patient_for_user(user, db)
    client_ip = request.client.host if request.client else "unknown"

    chart_data = get_unified_patient_chart(db=db, patient=patient, is_emergency=False)

    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="PATIENT_VIEW_OWN_RECORDS",
        resource_type="CLINICAL_RECORD",
        resource_id=str(patient.id),
        outcome="SUCCESS",
        ip_address=client_ip
    )

    return chart_data

@router.get("/my-consents", response_model=List[ConsentResponse])
def get_my_consents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns active and historical data-sharing consent directives for the patient.
    """
    patient = get_linked_patient_for_user(user, db)
    consents = db.query(PatientConsent).filter(
        PatientConsent.master_patient_id == patient.id
    ).order_by(PatientConsent.created_at.desc()).all()

    result = []
    for c in consents:
        result.append({
            "id": c.id,
            "master_patient_id": c.master_patient_id,
            "organization_id": c.organization_id,
            "organization_code": c.organization.code if c.organization else None,
            "organization_name": c.organization.name if c.organization else None,
            "consent_type": c.consent_type,
            "valid_from": c.valid_from,
            "valid_until": c.valid_until,
            "purpose": c.purpose,
            "status": c.status,
            "notes": c.notes,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        })
    return result

@router.post("/my-consents", response_model=ConsentResponse)
def create_or_update_consent(
    consent_in: ConsentCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Grants or updates sharing permission.
    Allowed consent types: FULL_SHARING, RESTRICTED_SOURCE, EMERGENCY_ONLY, REVOKED.
    """
    patient = get_linked_patient_for_user(user, db)
    client_ip = request.client.host if request.client else "unknown"

    # Revoke previous active consents if setting a broad policy
    if consent_in.consent_type in ["FULL_SHARING", "REVOKED", "EMERGENCY_ONLY"]:
        previous_active = db.query(PatientConsent).filter(
            PatientConsent.master_patient_id == patient.id,
            PatientConsent.status == "ACTIVE"
        ).all()
        for p in previous_active:
            p.status = "REVOKED"
            p.updated_at = datetime.utcnow()

    new_consent = PatientConsent(
        master_patient_id=patient.id,
        organization_id=consent_in.organization_id,
        consent_type=consent_in.consent_type,
        valid_from=date.today(),
        valid_until=consent_in.valid_until,
        purpose=consent_in.purpose,
        granted_by_user_id=user.id,
        status="ACTIVE",
        notes=consent_in.notes or "Updated by patient via Patient Portal"
    )
    db.add(new_consent)
    db.commit()
    db.refresh(new_consent)

    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="UPDATE_PATIENT_CONSENT_POLICY",
        resource_type="CONSENT",
        resource_id=str(new_consent.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={
            "consent_type": consent_in.consent_type,
            "organization_id": consent_in.organization_id
        }
    )

    return {
        "id": new_consent.id,
        "master_patient_id": new_consent.master_patient_id,
        "organization_id": new_consent.organization_id,
        "organization_code": new_consent.organization.code if new_consent.organization else None,
        "organization_name": new_consent.organization.name if new_consent.organization else None,
        "consent_type": new_consent.consent_type,
        "valid_from": new_consent.valid_from,
        "valid_until": new_consent.valid_until,
        "purpose": new_consent.purpose,
        "status": new_consent.status,
        "notes": new_consent.notes,
        "created_at": new_consent.created_at,
        "updated_at": new_consent.updated_at
    }

@router.get("/my-access-log")
def get_my_record_access_log(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Transparency feature: Patient views when and by whom their record was accessed.
    """
    patient = get_linked_patient_for_user(user, db)
    
    logs = db.query(AuditLog).filter(
        AuditLog.resource_type == "CLINICAL_RECORD",
        AuditLog.resource_id == str(patient.id)
    ).order_by(AuditLog.created_at.desc()).limit(100).all()

    result = []
    for l in logs:
        result.append({
            "id": l.id,
            "action": l.action,
            "actor_role": l.actor_role,
            "actor_name": l.actor.full_name if l.actor else "System / External",
            "timestamp": l.created_at,
            "outcome": l.outcome
        })
    return result

from app.models.opd import OpdEncounter
from app.models.lab import LabOrder
from app.models.pharmacy import PrescriptionOrder
from app.models.billing import Bill
import json

@router.get("/my-encounters")
def get_my_hospital_encounters(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns OPD encounters and hospital visits for authenticated patient.
    """
    patient = get_linked_patient_for_user(user, db)
    encounters = db.query(OpdEncounter).filter(
        OpdEncounter.master_patient_id == patient.id
    ).order_by(OpdEncounter.arrival_time.desc()).all()

    results = []
    for enc in encounters:
        doc_name = f"Dr. {enc.doctor.user.full_name}" if enc.doctor and enc.doctor.user else "Attending Duty Doctor"
        results.append({
            "id": enc.id,
            "token_number": enc.token_number,
            "department": enc.department,
            "doctor_name": doc_name,
            "status": enc.status,
            "visit_type": enc.visit_type,
            "arrival_time": enc.arrival_time,
            "vitals": {
                "bp": enc.vitals_bp,
                "pulse": enc.vitals_pulse,
                "temp": enc.vitals_temp,
                "spo2": enc.vitals_spo2
            },
            "chief_complaint": enc.chief_complaint,
            "clinical_notes": enc.clinical_notes
        })
    return results

@router.get("/my-prescriptions")
def get_my_prescriptions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns prescriptions and medication dispensing status for patient.
    """
    patient = get_linked_patient_for_user(user, db)
    rxs = db.query(PrescriptionOrder).filter(
        PrescriptionOrder.master_patient_id == patient.id
    ).order_by(PrescriptionOrder.created_at.desc()).all()

    results = []
    for rx in rxs:
        doc_name = f"Dr. {rx.doctor.user.full_name}" if rx.doctor and rx.doctor.user else "Prescribing Doctor"
        disp_list = [
            {
                "id": d.id,
                "quantity": d.dispensed_quantity,
                "batch": d.batch_number,
                "dispensed_at": d.dispensed_at,
                "pharmacist": d.pharmacist.full_name if d.pharmacist else "Staff Pharmacist"
            }
            for d in rx.dispensing_records
        ]
        results.append({
            "id": rx.id,
            "prescription_number": rx.prescription_number,
            "medication_name": rx.medication_name,
            "strength": rx.strength,
            "dosage": rx.dosage,
            "route": rx.route,
            "frequency": rx.frequency,
            "duration": rx.duration,
            "quantity_prescribed": rx.quantity_prescribed,
            "quantity_dispensed": rx.quantity_dispensed,
            "status": rx.status,
            "doctor_name": doc_name,
            "instructions": rx.instructions,
            "created_at": rx.created_at,
            "dispensing_records": disp_list
        })
    return results

@router.get("/my-lab-orders")
def get_my_lab_orders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns laboratory investigation orders and verified diagnostic reports for patient.
    """
    patient = get_linked_patient_for_user(user, db)
    orders = db.query(LabOrder).filter(
        LabOrder.master_patient_id == patient.id
    ).order_by(LabOrder.created_at.desc()).all()

    results = []
    for o in orders:
        doc_name = f"Dr. {o.doctor.user.full_name}" if o.doctor and o.doctor.user else "Ordering Clinician"
        parsed = None
        if o.results_json:
            try:
                parsed = json.loads(o.results_json)
            except Exception:
                parsed = []
        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "test_name": o.test_name,
            "priority": o.priority,
            "laboratory_name": o.laboratory_name,
            "status": o.status,
            "sample_type": o.sample_type,
            "sample_collected_at": o.sample_collected_at,
            "doctor_name": doc_name,
            "results": parsed,
            "verified_by": o.verified_by.full_name if o.verified_by else None,
            "verified_at": o.verified_at,
            "created_at": o.created_at
        })
    return results

@router.get("/my-bills")
def get_my_bills(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns itemized billing statements, payment status, and receipts for patient.
    """
    patient = get_linked_patient_for_user(user, db)
    bills = db.query(Bill).filter(
        Bill.master_patient_id == patient.id
    ).order_by(Bill.created_at.desc()).all()

    results = []
    for b in bills:
        items = [
            {"description": i.item_description, "unit_price": i.unit_price, "quantity": i.quantity, "total": i.total_price}
            for i in b.items
        ]
        payments = [
            {
                "receipt_number": p.receipt_number,
                "amount": p.amount,
                "method": p.payment_method,
                "date": p.created_at,
                "is_verified": p.is_verified
            }
            for p in b.payments
        ]
        results.append({
            "id": b.id,
            "bill_number": b.bill_number,
            "bill_type": b.bill_type,
            "total_amount": b.total_amount,
            "discount_amount": b.discount_amount,
            "tax_amount": b.tax_amount,
            "net_payable": b.net_payable,
            "amount_paid": b.amount_paid,
            "balance_due": b.balance_due,
            "status": b.status,
            "created_at": b.created_at,
            "items": items,
            "payments": payments
        })
    return results

@router.get("/my-timeline")
def get_my_unified_timeline(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns single unified chronological patient timeline that connects events across all systems:
    OPD registration, payment confirmed, check-in, consultation, lab order, sample, verified report,
    prescription, dispensing, and follow-ups.
    """
    patient = get_linked_patient_for_user(user, db)
    events = []

    # 1. OPD Encounters
    for enc in patient.opd_encounters:
        events.append({
            "event_type": "OPD_REGISTRATION",
            "title": f"OPD Registration ({enc.token_number})",
            "department": enc.department,
            "timestamp": enc.arrival_time,
            "actor": "Front Desk Receptionist",
            "status": enc.status,
            "details": f"Chief complaint: {enc.chief_complaint or 'General Consultation'}"
        })
        if enc.consultation_start_time:
            events.append({
                "event_type": "CONSULTATION_STARTED",
                "title": f"Doctor Consultation Started",
                "department": enc.department,
                "timestamp": enc.consultation_start_time,
                "actor": f"Dr. {enc.doctor.user.full_name}" if enc.doctor and enc.doctor.user else "Specialist",
                "status": "IN_PROGRESS",
                "details": f"Vitals BP: {enc.vitals_bp or 'Normal'}"
            })
        if enc.consultation_end_time:
            events.append({
                "event_type": "CONSULTATION_COMPLETED",
                "title": f"Doctor Consultation Completed",
                "department": enc.department,
                "timestamp": enc.consultation_end_time,
                "actor": f"Dr. {enc.doctor.user.full_name}" if enc.doctor and enc.doctor.user else "Specialist",
                "status": "COMPLETED",
                "details": enc.clinical_notes or "Consultation finished"
            })

    # 2. Billing & Payments
    for b in patient.bills:
        events.append({
            "event_type": "BILL_GENERATED",
            "title": f"Invoice Issued: {b.bill_number}",
            "department": b.bill_type,
            "timestamp": b.created_at,
            "actor": "Hospital Billing & Cashier",
            "status": b.status,
            "details": f"Amount: ₹{b.net_payable:.2f} (Balance Due: ₹{b.balance_due:.2f})"
        })
        for pay in b.payments:
            events.append({
                "event_type": "PAYMENT_CONFIRMED",
                "title": f"Payment Confirmed ({pay.receipt_number})",
                "department": "Cashier Desk",
                "timestamp": pay.created_at,
                "actor": "Verified Payment Gateway / Cashier",
                "status": "PAID",
                "details": f"₹{pay.amount:.2f} received via {pay.payment_method}."
            })

    # 3. Lab Orders & Reports
    for lab in patient.lab_orders:
        events.append({
            "event_type": "LAB_ORDERED",
            "title": f"Investigation Ordered: {lab.test_name}",
            "department": lab.laboratory_name,
            "timestamp": lab.created_at,
            "actor": f"Dr. {lab.doctor.user.full_name}" if lab.doctor and lab.doctor.user else "Doctor",
            "status": lab.status,
            "details": f"Order #{lab.order_number} (Priority: {lab.priority})"
        })
        if lab.sample_collected_at:
            events.append({
                "event_type": "SAMPLE_COLLECTED",
                "title": f"Specimen Collected: {lab.sample_type}",
                "department": lab.laboratory_name,
                "timestamp": lab.sample_collected_at,
                "actor": "Laboratory Phlebotomist",
                "status": "PROCESSING",
                "details": f"Order #{lab.order_number}"
            })
        if lab.verified_at:
            events.append({
                "event_type": "LAB_REPORT_VERIFIED",
                "title": f"Diagnostic Report Verified & Published",
                "department": lab.laboratory_name,
                "timestamp": lab.verified_at,
                "actor": lab.verified_by.full_name if lab.verified_by else "Chief Pathologist",
                "status": "PUBLISHED",
                "details": f"{lab.test_name} results published to patient record"
            })

    # 4. Prescriptions & Dispensing
    for rx in patient.prescriptions:
        events.append({
            "event_type": "PRESCRIPTION_ISSUED",
            "title": f"Prescription #{rx.prescription_number}",
            "department": "Pharmacy Services",
            "timestamp": rx.created_at,
            "actor": f"Dr. {rx.doctor.user.full_name}" if rx.doctor and rx.doctor.user else "Doctor",
            "status": rx.status,
            "details": f"{rx.medication_name} {rx.strength} - {rx.dosage} ({rx.frequency})"
        })
        for d in rx.dispensing_records:
            events.append({
                "event_type": "MEDICATION_DISPENSED",
                "title": f"Medication Dispensed: {rx.medication_name}",
                "department": "Outpatient Pharmacy",
                "timestamp": d.dispensed_at,
                "actor": d.pharmacist.full_name if d.pharmacist else "Licensed Pharmacist",
                "status": "DISPENSED",
                "details": f"Dispensed {d.dispensed_quantity} units (Batch: {d.batch_number})"
            })

    # Sort chronological newest first
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events

