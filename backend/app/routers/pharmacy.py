from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User, Doctor
from app.models.patient import MasterPatient
from app.models.opd import OpdEncounter
from app.models.pharmacy import PrescriptionOrder, DispensingRecord
from app.models.clinical import ClinicalMedication
from app.models.billing import Bill, BillItem
from app.models.notification import Notification
from app.schemas.pharmacy import (
    PrescriptionCreateRequest,
    DispenseMedicationRequest,
    ClarificationRequest,
    PrescriptionResponse,
    DispensingRecordResponse
)
from app.security import get_current_active_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy Dispensing & Medication Orders"])

def format_prescription(rx: PrescriptionOrder) -> PrescriptionResponse:
    p = rx.patient
    doc_name = f"Dr. {rx.doctor.user.full_name}" if rx.doctor and rx.doctor.user else "Prescribing Clinician"
    records = []
    for d in rx.dispensing_records:
        records.append(DispensingRecordResponse(
            id=d.id,
            prescription_id=d.prescription_id,
            pharmacist_name=d.pharmacist.full_name if d.pharmacist else "Staff Pharmacist",
            dispensed_quantity=d.dispensed_quantity,
            batch_number=d.batch_number,
            dispensed_at=d.dispensed_at,
            counseling_notes=d.counseling_notes
        ))
    return PrescriptionResponse(
        id=rx.id,
        prescription_number=rx.prescription_number,
        master_patient_id=rx.master_patient_id,
        patient_name=f"{p.first_name} {p.last_name}" if p else "Unknown",
        patient_national_id=p.national_health_id if p else "N/A",
        encounter_id=rx.encounter_id,
        doctor_id=rx.doctor_id,
        doctor_name=doc_name,
        medication_name=rx.medication_name,
        strength=rx.strength,
        dosage=rx.dosage,
        route=rx.route,
        frequency=rx.frequency,
        duration=rx.duration,
        quantity_prescribed=rx.quantity_prescribed,
        quantity_dispensed=rx.quantity_dispensed,
        status=rx.status,
        clarification_notes=rx.clarification_notes,
        instructions=rx.instructions,
        created_at=rx.created_at,
        dispensing_records=records
    )

@router.get("/prescriptions", response_model=List[PrescriptionResponse])
def get_prescriptions(
    status_filter: Optional[str] = None,
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List prescriptions.
    Accessible to Pharmacist, Doctor, Patient (scoped), and Admin.
    """
    query = db.query(PrescriptionOrder)

    if current_user.role == "patient":
        if not current_user.patient_profile:
            return []
        query = query.filter(PrescriptionOrder.master_patient_id == current_user.patient_profile.id)
    elif patient_id:
        query = query.filter(PrescriptionOrder.master_patient_id == patient_id)

    if status_filter:
        query = query.filter(PrescriptionOrder.status == status_filter)

    prescriptions = query.order_by(PrescriptionOrder.created_at.desc()).all()
    return [format_prescription(p) for p in prescriptions]

@router.post("/prescriptions", response_model=PrescriptionResponse)
def create_prescription(
    req: PrescriptionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Creates a prescription order for a patient.
    Permitted roles: Doctor, Admin.
    """
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized medical doctors can issue prescriptions."
        )

    patient = db.query(MasterPatient).filter(MasterPatient.id == req.master_patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    doc = None
    if current_user.doctor_profile:
        doc = current_user.doctor_profile
    else:
        doc = db.query(Doctor).first()
        if not doc:
            raise HTTPException(status_code=400, detail="No doctor profile configured.")

    rx_num = f"RX-2026-{db.query(PrescriptionOrder).count() + 101}"

    rx = PrescriptionOrder(
        prescription_number=rx_num,
        master_patient_id=patient.id,
        encounter_id=req.encounter_id,
        doctor_id=doc.id,
        medication_name=req.medication_name,
        strength=req.strength,
        dosage=req.dosage,
        route=req.route,
        frequency=req.frequency,
        duration=req.duration,
        quantity_prescribed=req.quantity_prescribed,
        quantity_dispensed=0,
        status="ISSUED",
        instructions=req.instructions
    )
    db.add(rx)
    db.flush()

    # Sync to clinical medications for longitudinal EHR chart
    med = ClinicalMedication(
        master_patient_id=patient.id,
        organization_id=1,
        medication_name=f"{req.medication_name} {req.strength}",
        dosage=f"{req.dosage} ({req.frequency})",
        route=req.route,
        frequency=req.frequency,
        status="ACTIVE",
        prescriber_name=f"Dr. {current_user.full_name}",
        instructions=req.instructions,
        recorded_at=datetime.utcnow()
    )
    db.add(med)

    # Billing calculation for prescription
    unit_cost = 12.50
    total_cost = unit_cost * req.quantity_prescribed

    bill = None
    if req.encounter_id:
        bill = db.query(Bill).filter(Bill.encounter_id == req.encounter_id).first()

    if bill:
        item = BillItem(
            bill_id=bill.id,
            item_description=f"Pharmacy: {req.medication_name} {req.strength} (Qty: {req.quantity_prescribed})",
            unit_price=unit_cost,
            quantity=req.quantity_prescribed,
            total_price=total_cost
        )
        db.add(item)
        bill.total_amount += total_cost
        bill.net_payable += total_cost
        bill.balance_due += total_cost
        if bill.status == "PAID":
            bill.status = "PARTIALLY_PAID"
    else:
        bill_num = f"INV-PHARM-{rx.id}-{int(datetime.utcnow().timestamp()) % 10000}"
        bill = Bill(
            bill_number=bill_num,
            master_patient_id=patient.id,
            encounter_id=req.encounter_id,
            bill_type="PHARMACY",
            total_amount=total_cost,
            discount_amount=0.0,
            tax_amount=0.0,
            net_payable=total_cost,
            amount_paid=0.0,
            balance_due=total_cost,
            status="PENDING",
            notes=f"Medication charge for {req.medication_name}",
            created_by_user_id=current_user.id
        )
        db.add(bill)
        db.flush()
        item = BillItem(
            bill_id=bill.id,
            item_description=f"Pharmacy: {req.medication_name} {req.strength}",
            unit_price=unit_cost,
            quantity=req.quantity_prescribed,
            total_price=total_cost
        )
        db.add(item)

    db.commit()
    db.refresh(rx)

    # Notify patient
    if patient.linked_user_id:
        db.add(Notification(
            user_id=patient.linked_user_id,
            title="Prescription Issued",
            message=f"Dr. {current_user.full_name} issued prescription #{rx_num} for {req.medication_name}.",
            category="PRESCRIPTION"
        ))
        db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="PRESCRIPTION_ISSUED",
        target_resource=f"PrescriptionOrder:{rx.id}",
        details=f"Prescribed {req.medication_name} {req.strength} (Qty: {req.quantity_prescribed})",
        patient_id=patient.id
    )

    return format_prescription(rx)

@router.post("/prescriptions/{rx_id}/dispense", response_model=PrescriptionResponse)
def dispense_medication(
    rx_id: int,
    req: DispenseMedicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Records physical dispensing of prescription medication by a licensed pharmacist.
    Critical safety rule: pharmacist does not alter doctor's prescription.
    """
    if current_user.role not in ["pharmacist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only licensed pharmacists or administrators can record medication dispensing."
        )

    rx = db.query(PrescriptionOrder).filter(PrescriptionOrder.id == rx_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    if req.dispensed_quantity <= 0:
        raise HTTPException(status_code=400, detail="Dispensed quantity must be greater than zero.")

    rx.quantity_dispensed += req.dispensed_quantity
    if rx.quantity_dispensed >= rx.quantity_prescribed:
        rx.status = "DISPENSED"
    else:
        rx.status = "PARTIALLY_DISPENSED"

    disp_record = DispensingRecord(
        prescription_id=rx.id,
        pharmacist_user_id=current_user.id,
        dispensed_quantity=req.dispensed_quantity,
        batch_number=req.batch_number,
        counseling_notes=req.counseling_notes
    )
    db.add(disp_record)
    db.commit()
    db.refresh(rx)

    # Notify patient
    if rx.patient and rx.patient.linked_user_id:
        db.add(Notification(
            user_id=rx.patient.linked_user_id,
            title="Medication Dispensed",
            message=f"{req.dispensed_quantity} units of {rx.medication_name} dispensed (Batch: {req.batch_number}).",
            category="PRESCRIPTION"
        ))
        db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="MEDICATION_DISPENSED",
        target_resource=f"PrescriptionOrder:{rx.id}",
        details=f"Dispensed {req.dispensed_quantity} units (Batch: {req.batch_number})",
        patient_id=rx.master_patient_id
    )

    return format_prescription(rx)

@router.post("/prescriptions/{rx_id}/clarification", response_model=PrescriptionResponse)
def request_prescription_clarification(
    rx_id: int,
    req: ClarificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Requests clarification from the ordering physician before dispensing.
    """
    if current_user.role not in ["pharmacist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only licensed pharmacists or administrators can request prescription clarifications."
        )

    rx = db.query(PrescriptionOrder).filter(PrescriptionOrder.id == rx_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    rx.status = "CLARIFICATION_REQUIRED"
    rx.clarification_requested_by_id = current_user.id
    rx.clarification_notes = req.clarification_notes
    db.commit()
    db.refresh(rx)

    # Notify prescribing doctor
    if rx.doctor and rx.doctor.user:
        db.add(Notification(
            user_id=rx.doctor.user.id,
            title="Prescription Clarification Required",
            message=f"Pharmacist {current_user.full_name} flagged Rx #{rx.prescription_number} ({rx.medication_name}): {req.clarification_notes}",
            category="PRESCRIPTION"
        ))
        db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="PRESCRIPTION_CLARIFICATION_REQUESTED",
        target_resource=f"PrescriptionOrder:{rx.id}",
        details=f"Clarification flagged: {req.clarification_notes}",
        patient_id=rx.master_patient_id
    )

    return format_prescription(rx)
