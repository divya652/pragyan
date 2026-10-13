import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User, Doctor
from app.models.patient import MasterPatient
from app.models.opd import OpdEncounter
from app.models.lab import LabOrder
from app.models.clinical import ClinicalLabResult
from app.models.billing import Bill, BillItem
from app.models.notification import Notification
from app.schemas.lab import (
    LabOrderCreateRequest,
    LabSampleCollectRequest,
    LabResultEntryRequest,
    LabOrderResponse
)
from app.security import get_current_active_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/lab", tags=["Laboratory Workflow & Diagnostics"])

def format_lab_order(order: LabOrder) -> LabOrderResponse:
    p = order.patient
    doc_name = f"Dr. {order.doctor.user.full_name}" if order.doctor and order.doctor.user else "Ordering Clinician"
    verified_name = order.verified_by.full_name if order.verified_by else None
    
    parsed_results = None
    if order.results_json:
        try:
            parsed_results = json.loads(order.results_json)
        except Exception:
            parsed_results = []

    return LabOrderResponse(
        id=order.id,
        order_number=order.order_number,
        master_patient_id=order.master_patient_id,
        patient_name=f"{p.first_name} {p.last_name}" if p else "Unknown",
        patient_national_id=p.national_health_id if p else "N/A",
        encounter_id=order.encounter_id,
        ordering_doctor_id=order.ordering_doctor_id,
        ordering_doctor_name=doc_name,
        test_name=order.test_name,
        priority=order.priority,
        laboratory_name=order.laboratory_name,
        status=order.status,
        sample_type=order.sample_type,
        sample_collected_at=order.sample_collected_at,
        results_json=order.results_json,
        results=parsed_results,
        verified_by_name=verified_name,
        verified_at=order.verified_at,
        clinical_notes=order.clinical_notes,
        created_at=order.created_at
    )

@router.get("/orders", response_model=List[LabOrderResponse])
def get_lab_orders(
    status_filter: Optional[str] = None,
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List laboratory test orders.
    Accessible to Lab Technician, Doctor, Patient (scoped), and Admin.
    """
    query = db.query(LabOrder)

    if current_user.role == "patient":
        if not current_user.patient_profile:
            return []
        query = query.filter(LabOrder.master_patient_id == current_user.patient_profile.id)
    elif patient_id:
        query = query.filter(LabOrder.master_patient_id == patient_id)

    if status_filter:
        query = query.filter(LabOrder.status == status_filter)

    orders = query.order_by(LabOrder.created_at.desc()).all()
    return [format_lab_order(o) for o in orders]

@router.post("/orders", response_model=LabOrderResponse)
def create_lab_order(
    req: LabOrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Orders a diagnostic laboratory investigation.
    Permitted roles: Doctor, Admin.
    """
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized medical doctors can order diagnostic laboratory tests."
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

    order_num = f"LAB-2026-{db.query(LabOrder).count() + 101}"

    order = LabOrder(
        order_number=order_num,
        master_patient_id=patient.id,
        encounter_id=req.encounter_id,
        ordering_doctor_id=doc.id,
        test_name=req.test_name,
        priority=req.priority,
        laboratory_name=req.laboratory_name,
        status="ORDERED",
        sample_type=req.sample_type or "Venous Blood",
        clinical_notes=req.clinical_notes
    )
    db.add(order)
    db.flush()

    # Automatically add bill item to existing encounter bill or create lab bill
    test_pricing = {
        "Complete Blood Count (CBC)": 350.0,
        "Comprehensive Metabolic Panel": 650.0,
        "Lipid Profile": 500.0,
        "HbA1c Glycated Hemoglobin": 450.0,
        "Serum Creatinine & eGFR": 300.0,
        "Thyroid Stimulating Hormone (TSH)": 400.0
    }
    fee = test_pricing.get(req.test_name, 400.0)

    bill = None
    if req.encounter_id:
        bill = db.query(Bill).filter(Bill.encounter_id == req.encounter_id).first()

    if bill:
        item = BillItem(
            bill_id=bill.id,
            item_description=f"Lab Investigation: {req.test_name}",
            unit_price=fee,
            quantity=1,
            total_price=fee
        )
        db.add(item)
        bill.total_amount += fee
        bill.net_payable += fee
        bill.balance_due += fee
        if bill.status == "PAID":
            bill.status = "PARTIALLY_PAID"
    else:
        bill_num = f"INV-LAB-{order.id}-{int(datetime.utcnow().timestamp()) % 10000}"
        bill = Bill(
            bill_number=bill_num,
            master_patient_id=patient.id,
            encounter_id=req.encounter_id,
            bill_type="LABORATORY",
            total_amount=fee,
            discount_amount=0.0,
            tax_amount=0.0,
            net_payable=fee,
            amount_paid=0.0,
            balance_due=fee,
            status="PENDING",
            notes=f"Investigation fee for {req.test_name}",
            created_by_user_id=current_user.id
        )
        db.add(bill)
        db.flush()
        item = BillItem(
            bill_id=bill.id,
            item_description=f"Lab: {req.test_name}",
            unit_price=fee,
            quantity=1,
            total_price=fee
        )
        db.add(item)

    db.commit()
    db.refresh(order)

    # In-app notification
    if patient.linked_user_id:
        db.add(Notification(
            user_id=patient.linked_user_id,
            title="Laboratory Investigation Ordered",
            message=f"Order {order_num}: {req.test_name} was ordered by Dr. {current_user.full_name}.",
            category="LAB_REPORT"
        ))
        db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="LAB_ORDER_CREATED",
        target_resource=f"LabOrder:{order.id}",
        details=f"Ordered {req.test_name} (Priority: {req.priority})",
        patient_id=patient.id
    )

    return format_lab_order(order)

@router.post("/orders/{order_id}/collect-sample", response_model=LabOrderResponse)
def collect_sample(
    order_id: int,
    req: LabSampleCollectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Records collection of biological specimen.
    Permitted: Lab Technician, Admin.
    """
    if current_user.role not in ["lab_technician", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only laboratory technicians or admins can record specimen collection."
        )

    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found.")

    order.status = "SAMPLE_COLLECTED"
    order.sample_type = req.sample_type
    order.sample_collected_at = datetime.utcnow()
    order.collected_by_user_id = current_user.id
    if req.sample_notes:
        order.clinical_notes = (order.clinical_notes or "") + f"\n[Sample]: {req.sample_notes}"

    db.commit()
    db.refresh(order)

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="LAB_SAMPLE_COLLECTED",
        target_resource=f"LabOrder:{order.id}",
        details=f"Sample type: {req.sample_type}",
        patient_id=order.master_patient_id
    )

    return format_lab_order(order)

@router.post("/orders/{order_id}/enter-results", response_model=LabOrderResponse)
def enter_lab_results(
    order_id: int,
    req: LabResultEntryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Enters structured diagnostic results and advances to AWAITING_VERIFICATION.
    Permitted: Lab Technician, Admin.
    """
    if current_user.role not in ["lab_technician", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only laboratory technicians or admins can enter diagnostic test results."
        )

    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found.")

    results_data = [item.model_dump() for item in req.results]
    order.results_json = json.dumps(results_data)
    order.status = "AWAITING_VERIFICATION"
    if req.clinical_notes:
        order.clinical_notes = req.clinical_notes

    db.commit()
    db.refresh(order)

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="LAB_RESULTS_ENTERED",
        target_resource=f"LabOrder:{order.id}",
        details=f"Results entered for {len(req.results)} analytes",
        patient_id=order.master_patient_id
    )

    return format_lab_order(order)

@router.post("/orders/{order_id}/verify-and-publish", response_model=LabOrderResponse)
def verify_and_publish_lab_report(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Verifies and publishes the final clinical laboratory report.
    Only authorized laboratory personnel or admins can verify.
    Also syncs into ClinicalLabResult for longitudinal EHR timeline.
    """
    if current_user.role not in ["lab_technician", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verified laboratory personnel or admins can publish official laboratory reports."
        )

    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found.")

    if not order.results_json:
        raise HTTPException(status_code=400, detail="Cannot verify an empty report. Results must be entered first.")

    order.status = "PUBLISHED"
    order.verified_by_user_id = current_user.id
    order.verified_at = datetime.utcnow()

    # Sync into longitudinal clinical lab results
    try:
        results_list = json.loads(order.results_json)
        primary_val = results_list[0].get("result_value", "Completed") if results_list else "Completed"
        primary_unit = results_list[0].get("unit", "") if results_list else ""
        primary_ref = results_list[0].get("reference_range", "") if results_list else ""
        primary_flag = results_list[0].get("flag", "NORMAL") if results_list else "NORMAL"
    except Exception:
        primary_val = "Published"
        primary_unit = ""
        primary_ref = ""
        primary_flag = "NORMAL"

    org_id = 1
    if order.encounter and order.encounter.organization_id:
        org_id = order.encounter.organization_id

    clin_lab = ClinicalLabResult(
        master_patient_id=order.master_patient_id,
        organization_id=org_id,
        test_name=order.test_name,
        loinc_code="LOINC-SYNTH",
        result_value=primary_val,
        unit=primary_unit,
        reference_range=primary_ref,
        flag=primary_flag,
        test_date=datetime.utcnow(),
        status="FINAL",
        comments=f"Verified by {current_user.full_name}. Order #{order.order_number}"
    )
    db.add(clin_lab)
    db.commit()
    db.refresh(order)

    # Notify ordering doctor and patient
    if order.doctor and order.doctor.user:
        db.add(Notification(
            user_id=order.doctor.user.id,
            title="Lab Report Published",
            message=f"Official report published for Order {order.order_number} ({order.test_name}).",
            category="LAB_REPORT"
        ))

    if order.patient and order.patient.linked_user_id:
        db.add(Notification(
            user_id=order.patient.linked_user_id,
            title="Diagnostic Report Ready",
            message=f"Your laboratory results for {order.test_name} have been published and are available.",
            category="LAB_REPORT"
        ))
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="LAB_REPORT_PUBLISHED",
        target_resource=f"LabOrder:{order.id}",
        details=f"Verified and published by {current_user.full_name}",
        patient_id=order.master_patient_id
    )

    return format_lab_order(order)
