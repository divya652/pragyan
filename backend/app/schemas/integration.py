from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class IntegrationJobResponse(BaseModel):
    id: int
    organization_id: int
    organization_code: str
    organization_name: str
    job_type: str
    records_processed: int
    records_matched: int
    conflicts_detected: int
    errors_count: int
    status: str
    error_details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ImportDataRequest(BaseModel):
    payload: Any  # JSON list or dict containing simulated FHIR or Legacy EHR data
