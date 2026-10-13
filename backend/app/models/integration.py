from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class IntegrationJob(Base):
    __tablename__ = "integration_jobs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    job_type = Column(String(50), nullable=False)  # FHIR_IMPORT, LEGACY_CSV_IMPORT, BATCH_SYNC
    records_processed = Column(Integer, default=0, nullable=False)
    records_matched = Column(Integer, default=0, nullable=False)
    conflicts_detected = Column(Integer, default=0, nullable=False)
    errors_count = Column(Integer, default=0, nullable=False)
    status = Column(String(30), default="COMPLETED", nullable=False)  # COMPLETED, FAILED, PARTIAL
    error_details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("HealthcareOrganization", back_populates="integration_jobs")
