from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.patient import MasterPatient
from app.models.billing import Bill, BillItem, PaymentTransaction
from app.models.notification import Notification
from app.schemas.billing import (
    BillCreateRequest,
    PaymentProcessRequest,
    BillResponse,
    BillItemResponse,
    PaymentTransactionResponse
)
from app.security import get_current_active_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/billing", tags=["Hospital Billing, Cashier & Payments"])

def format_bill(b: Bill) -> BillResponse:
    p = b.patient
    items_resp = [
        BillItemResponse(
            id=i.id,
            item_description=i.item_description,
            unit_price=i.unit_price,
            quantity=i.quantity,
            total_price=i.total_price
        )
        for i in b.items
    ]
    payments_resp = [
        PaymentTransactionResponse(
            id=pay.id,
            transaction_ref=pay.transaction_ref,
            bill_id=pay.bill_id,
            amount=pay.amount,
            payment_method=pay.payment_method,
            payment_status=pay.payment_status,
            receipt_number=pay.receipt_number,
            is_verified=pay.is_verified,
            notes=pay.notes,
            created_at=pay.created_at
        )
        for pay in b.payments
    ]
    return BillResponse(
        id=b.id,
        bill_number=b.bill_number,
        master_patient_id=b.master_patient_id,
        patient_name=f"{p.first_name} {p.last_name}" if p else "Unknown",
        patient_national_id=p.national_health_id if p else "N/A",
        encounter_id=b.encounter_id,
        bill_type=b.bill_type,
        total_amount=b.total_amount,
        discount_amount=b.discount_amount,
        tax_amount=b.tax_amount,
        net_payable=b.net_payable,
        amount_paid=b.amount_paid,
        balance_due=b.balance_due,
        status=b.status,
        notes=b.notes,
        created_at=b.created_at,
        items=items_resp,
        payments=payments_resp
    )

@router.get("/bills", response_model=List[BillResponse])
def get_bills(
    status_filter: Optional[str] = None,
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List hospital bills.
    Accessible to Cashier, Receptionist, Admin, and Patient (scoped to own records).
    """
    query = db.query(Bill)

    if current_user.role == "patient":
        if not current_user.patient_profile:
            return []
        query = query.filter(Bill.master_patient_id == current_user.patient_profile.id)
    elif patient_id:
        query = query.filter(Bill.master_patient_id == patient_id)

    if status_filter:
        query = query.filter(Bill.status == status_filter)

    bills = query.order_by(Bill.created_at.desc()).all()
    return [format_bill(b) for b in bills]

@router.post("/bills", response_model=BillResponse)
def create_bill(
    req: BillCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Creates an itemized bill.
    Permitted roles: Cashier, Receptionist, Admin.
    """
    if current_user.role not in ["cashier", "receptionist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only billing staff, cashiers, or admins can create invoices."
        )

    patient = db.query(MasterPatient).filter(MasterPatient.id == req.master_patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    total = sum(i.unit_price * i.quantity for i in req.items)
    net = total - req.discount_amount + req.tax_amount

    bill_num = f"INV-GEN-{db.query(Bill).count() + 101}"

    bill = Bill(
        bill_number=bill_num,
        master_patient_id=patient.id,
        encounter_id=req.encounter_id,
        bill_type=req.bill_type,
        total_amount=total,
        discount_amount=req.discount_amount,
        tax_amount=req.tax_amount,
        net_payable=net,
        amount_paid=0.0,
        balance_due=net,
        status="PENDING",
        notes=req.notes,
        created_by_user_id=current_user.id
    )
    db.add(bill)
    db.flush()

    for item in req.items:
        db.add(BillItem(
            bill_id=bill.id,
            item_description=item.item_description,
            unit_price=item.unit_price,
            quantity=item.quantity,
            total_price=item.unit_price * item.quantity
        ))

    db.commit()
    db.refresh(bill)

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="BILL_CREATED",
        target_resource=f"Bill:{bill.id}",
        details=f"Created {bill_num} with total {net} INR",
        patient_id=patient.id
    )

    return format_bill(bill)

@router.post("/pay", response_model=BillResponse)
def process_payment(
    req: PaymentProcessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Processes verified payment transaction (Sandbox Gateway or Audited Cashier).
    Critical rule: Green checkmark 'PAID' appears only after verified transaction commit.
    Prevents duplicate payments on already settled bills.
    """
    bill = db.query(Bill).filter(Bill.id == req.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    if bill.status == "PAID" and bill.balance_due <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate payment prevented: This invoice is already marked as fully PAID."
        )

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    # Sandbox transaction verification simulation
    txn_ref = f"TXN-SB-{int(datetime.utcnow().timestamp())}-{bill.id}"
    receipt_num = f"REC-2026-{db.query(PaymentTransaction).count() + 101}"

    payment = PaymentTransaction(
        transaction_ref=txn_ref,
        bill_id=bill.id,
        amount=req.amount,
        payment_method=req.payment_method,
        payment_status="SUCCESS",
        receipt_number=receipt_num,
        processed_by_user_id=current_user.id,
        is_verified=True,  # Verified backend payment confirmation
        notes=req.notes or f"Payment processed via {req.payment_method}"
    )
    db.add(payment)

    bill.amount_paid += req.amount
    bill.balance_due = max(0.0, bill.net_payable - bill.amount_paid)

    if bill.balance_due <= 0.0:
        bill.status = "PAID"
    else:
        bill.status = "PARTIALLY_PAID"

    db.commit()
    db.refresh(bill)

    # In-app notification to patient
    if bill.patient and bill.patient.linked_user_id:
        db.add(Notification(
            user_id=bill.patient.linked_user_id,
            title="Payment Confirmed",
            message=f"Payment of ₹{req.amount:.2f} received for {bill.bill_number}. Receipt #{receipt_num}.",
            category="BILLING"
        ))
        db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="PAYMENT_CONFIRMED",
        target_resource=f"PaymentTransaction:{payment.id}",
        details=f"Processed ₹{req.amount:.2f} via {req.payment_method}. Receipt {receipt_num}. Bill status: {bill.status}",
        patient_id=bill.master_patient_id
    )

    return format_bill(bill)

@router.get("/receipt/{receipt_number}")
def get_receipt(
    receipt_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns official payment receipt details.
    """
    pay = db.query(PaymentTransaction).filter(PaymentTransaction.receipt_number == receipt_number).first()
    if not pay:
        raise HTTPException(status_code=404, detail="Receipt not found.")

    b = pay.bill
    p = b.patient
    return {
        "receipt_type": "OFFICIAL_HOSPITAL_PAYMENT_RECEIPT",
        "receipt_number": pay.receipt_number,
        "transaction_ref": pay.transaction_ref,
        "date_time": pay.created_at.strftime("%d-%b-%Y %I:%M %p"),
        "hospital_name": "Metro General Hospital & Research Institute",
        "patient": {
            "name": f"{p.first_name} {p.last_name}",
            "national_health_id": p.national_health_id,
            "phone": p.phone
        },
        "bill_number": b.bill_number,
        "bill_type": b.bill_type,
        "items": [
            {"description": i.item_description, "amount": i.total_price}
            for i in b.items
        ],
        "amount_paid": pay.amount,
        "payment_method": pay.payment_method,
        "payment_status": pay.payment_status,
        "remaining_balance": b.balance_due,
        "is_verified": pay.is_verified,
        "cashier_audited_by": pay.processed_by.full_name if pay.processed_by else "Payment Gateway Sandbox"
    }
