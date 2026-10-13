from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "INV-2026-101"
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("opd_encounters.id", ondelete="SET NULL"), nullable=True, index=True)
    
    bill_type = Column(String(50), default="OPD_CONSULTATION", nullable=False)  # OPD_CONSULTATION, LABORATORY, PHARMACY, COMPOSITE
    total_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    net_payable = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0, nullable=False)
    balance_due = Column(Float, default=0.0, nullable=False)
    
    # Workflow status: DRAFT, PENDING, PARTIALLY_PAID, PAID, CANCELLED, REFUNDED
    status = Column(String(50), default="PENDING", nullable=False)
    notes = Column(Text, nullable=True)
    
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("MasterPatient", back_populates="bills")
    encounter = relationship("OpdEncounter", back_populates="bills")
    created_by = relationship("User")
    items = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")
    payments = relationship("PaymentTransaction", back_populates="bill", cascade="all, delete-orphan")

class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)
    item_description = Column(String(200), nullable=False)
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    total_price = Column(Float, nullable=False)

    bill = relationship("Bill", back_populates="items")

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_ref = Column(String(100), unique=True, index=True, nullable=False)  # e.g. "TXN-SB-2026-99120"
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="UPI", nullable=False)  # CASH, UPI, CREDIT_CARD, DEBIT_CARD, SANDBOX_GATEWAY
    payment_status = Column(String(50), default="SUCCESS", nullable=False)  # SUCCESS, FAILED, REFUNDED
    receipt_number = Column(String(100), unique=True, index=True, nullable=False)  # e.g. "REC-2026-101"
    processed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)  # Critical payment rule: verified backend check
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    bill = relationship("Bill", back_populates="payments")
    processed_by = relationship("User")
