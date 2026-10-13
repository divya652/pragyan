from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ConsentCreate(BaseModel):
    consent_type: str  # FULL_SHARING, RESTRICTED_SOURCE, EMERGENCY_ONLY, REVOKED
    organization_id: Optional[int] = None
    purpose: str = "TREATMENT"
    valid_until: Optional[date] = None
    notes: Optional[str] = None

class ConsentResponse(BaseModel):
    id: int
    master_patient_id: int
    organization_id: Optional[int] = None
    organization_code: Optional[str] = None
    organization_name: Optional[str] = None
    consent_type: str
    valid_from: date
    valid_until: Optional[date] = None
    purpose: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
