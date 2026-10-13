from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class OpdEncounter(Base):
    __tablename__ = "opd_encounters"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    token_number = Column(String(50), nullable=False, index=True)  # e.g. "OPD-101"
    department = Column(String(100), nullable=False)
    visit_type = Column(String(50), default="WALK_IN", nullable=False)  # WALK_IN, APPOINTMENT
    status = Column(String(50), default="REGISTERED", nullable=False)  
    # Lifecycle: REGISTERED -> CHECKED_IN -> WAITING -> WITH_DOCTOR -> CONSULTATION_COMPLETED -> CLOSED (or CANCELLED, NO_SHOW)
    arrival_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    consultation_start_time = Column(DateTime, nullable=True)
    consultation_end_time = Column(DateTime, nullable=True)
    
    # Clinical vitals recorded at intake
    vitals_bp = Column(String(50), nullable=True)       # e.g. "120/80 mmHg"
    vitals_pulse = Column(String(50), nullable=True)    # e.g. "76 bpm"
    vitals_temp = Column(String(50), nullable=True)     # e.g. "98.4 F"
    vitals_spo2 = Column(String(50), nullable=True)     # e.g. "99%"
    chief_complaint = Column(Text, nullable=True)
    clinical_notes = Column(Text, nullable=True)
    
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("MasterPatient", back_populates="opd_encounters")
    doctor = relationship("Doctor", back_populates="opd_encounters")
    organization = relationship("HealthcareOrganization")
    created_by = relationship("User")
    
    bills = relationship("Bill", back_populates="encounter")
    lab_orders = relationship("LabOrder", back_populates="encounter")
    prescriptions = relationship("PrescriptionOrder", back_populates="encounter")
