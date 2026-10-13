from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class PrescriptionOrder(Base):
    __tablename__ = "prescription_orders"

    id = Column(Integer, primary_key=True, index=True)
    prescription_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "RX-2026-101"
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("opd_encounters.id", ondelete="SET NULL"), nullable=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    medication_name = Column(String(150), nullable=False, index=True)
    strength = Column(String(50), nullable=False)  # e.g. "500 mg"
    dosage = Column(String(100), default="1 Tablet", nullable=False)  # e.g. "1 Tablet"
    route = Column(String(50), default="ORAL", nullable=False)  # ORAL, TOPICAL, INHALATION, IV
    frequency = Column(String(100), default="Twice daily after meals", nullable=False)
    duration = Column(String(100), default="14 Days", nullable=False)
    quantity_prescribed = Column(Integer, default=30, nullable=False)
    quantity_dispensed = Column(Integer, default=0, nullable=False)
    
    # Workflow status: ISSUED -> PARTIALLY_DISPENSED -> DISPENSED (or CLARIFICATION_REQUIRED, CANCELLED)
    status = Column(String(50), default="ISSUED", nullable=False)
    
    clarification_requested_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    clarification_notes = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("MasterPatient", back_populates="prescriptions")
    encounter = relationship("OpdEncounter", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")
    clarification_requested_by = relationship("User", foreign_keys=[clarification_requested_by_id])
    dispensing_records = relationship("DispensingRecord", back_populates="prescription", cascade="all, delete-orphan")

class DispensingRecord(Base):
    __tablename__ = "dispensing_records"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescription_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    pharmacist_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    dispensed_quantity = Column(Integer, nullable=False)
    batch_number = Column(String(50), default="B-2026-X9", nullable=False)
    dispensed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    counseling_notes = Column(Text, nullable=True)

    prescription = relationship("PrescriptionOrder", back_populates="dispensing_records")
    pharmacist = relationship("User")
