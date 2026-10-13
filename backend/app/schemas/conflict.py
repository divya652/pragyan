from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ConflictResolveRequest(BaseModel):
    resolution_notes: str
    preferred_source_org_id: Optional[int] = None
    resolved_value: Optional[str] = None

class ConflictResponse(BaseModel):
    id: int
    master_patient_id: int
    conflict_category: str
    field_name: str
    
    source_a_org_id: int
    source_a_org_code: str
    source_a_org_name: str
    source_a_value: str
    source_a_timestamp: datetime

    source_b_org_id: int
    source_b_org_code: str
    source_b_org_name: str
    source_b_value: str
    source_b_timestamp: datetime

    resolution_status: str
    resolution_notes: Optional[str] = None
    resolved_by_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
