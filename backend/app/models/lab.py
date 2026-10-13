from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class LabOrder(Base):
    __tablename__ = "lab_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "LAB-2026-101"
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("opd_encounters.id", ondelete="SET NULL"), nullable=True, index=True)
    ordering_doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    test_name = Column(String(150), nullable=False, index=True)
    priority = Column(String(30), default="ROUTINE", nullable=False)  # ROUTINE, URGENT, STAT
    laboratory_name = Column(String(150), default="Central Diagnostic Laboratory", nullable=False)
    
    # Workflow status: ORDERED -> SAMPLE_COLLECTED -> PROCESSING -> AWAITING_VERIFICATION -> VERIFIED -> PUBLISHED
    status = Column(String(50), default="ORDERED", nullable=False)
    sample_type = Column(String(100), default="Venous Blood", nullable=True)
    sample_collected_at = Column(DateTime, nullable=True)
    collected_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Structured results entered by lab technician
    results_json = Column(Text, nullable=True)  # JSON string of [{parameter, value, unit, reference_range, flag}]
    verified_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    clinical_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("MasterPatient", back_populates="lab_orders")
    encounter = relationship("OpdEncounter", back_populates="lab_orders")
    doctor = relationship("Doctor", back_populates="lab_orders")
    collected_by = relationship("User", foreign_keys=[collected_by_user_id])
    verified_by = relationship("User", foreign_keys=[verified_by_user_id])
