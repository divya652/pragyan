from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_role = Column(String(50), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # VIEW_CLINICAL_CHART, SEARCH_PATIENTS, IMPORT_DATA, REJECT_MATCH, UPDATE_CONSENT, UNAUTHORIZED_ATTEMPT
    resource_type = Column(String(50), nullable=False)  # PATIENT, CLINICAL_RECORD, USER, CONSENT, INTEGRATION
    resource_id = Column(String(100), nullable=True)
    outcome = Column(String(20), nullable=False)  # SUCCESS, DENIED, ERROR
    ip_address = Column(String(50), nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    actor = relationship("User", back_populates="audit_logs")
