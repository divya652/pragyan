from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class DataConflict(Base):
    __tablename__ = "data_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    conflict_category = Column(String(50), nullable=False)  # DEMOGRAPHIC_PHONE, DEMOGRAPHIC_DOB, CLINICAL_ALLERGY, CLINICAL_MEDICATION
    field_name = Column(String(100), nullable=False)
    
    source_a_org_id = Column(Integer, ForeignKey("healthcare_organizations.id"), nullable=False)
    source_a_value = Column(Text, nullable=False)
    source_a_timestamp = Column(DateTime, nullable=False)

    source_b_org_id = Column(Integer, ForeignKey("healthcare_organizations.id"), nullable=False)
    source_b_value = Column(Text, nullable=False)
    source_b_timestamp = Column(DateTime, nullable=False)

    resolution_status = Column(String(30), default="OPEN", nullable=False)  # OPEN, RESOLVED, DISMISSED
    resolution_notes = Column(Text, nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    master_patient = relationship("MasterPatient", back_populates="conflicts")
    source_a_org = relationship("HealthcareOrganization", foreign_keys=[source_a_org_id])
    source_b_org = relationship("HealthcareOrganization", foreign_keys=[source_b_org_id])
    resolved_by = relationship("User")
