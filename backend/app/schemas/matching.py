from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class MatchCandidateResponse(BaseModel):
    id: int
    source_record_id: int
    source_organization_code: str
    source_organization_name: str
    source_patient_id: str
    source_demographics: dict
    
    candidate_master_patient_id: int
    candidate_national_health_id: str
    candidate_name: str
    candidate_dob: str
    candidate_gender: str
    candidate_phone: Optional[str] = None
    
    match_score: float
    match_criteria: dict
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class MatchActionRequest(BaseModel):
    action: str  # 'APPROVE_LINK' or 'REJECT_LINK'
    review_notes: str
