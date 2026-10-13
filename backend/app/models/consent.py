from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class PatientConsent(Base):
    __tablename__ = "patient_consents"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=True, index=True)
    consent_type = Column(String(50), nullable=False)  # FULL_SHARING, RESTRICTED_SOURCE, EMERGENCY_ONLY, REVOKED
    valid_from = Column(Date, default=date.today, nullable=False)
    valid_until = Column(Date, nullable=True)
    purpose = Column(String(100), default="TREATMENT", nullable=False)  # TREATMENT, RESEARCH, EMERGENCY
    granted_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, REVOKED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    master_patient = relationship("MasterPatient", back_populates="consents")
    organization = relationship("HealthcareOrganization", back_populates="patient_consents")
    granted_by = relationship("User")
