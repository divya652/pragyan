from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class LabResultItem(BaseModel):
    parameter: str
    result_value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: str = "NORMAL"  # NORMAL, HIGH, LOW, CRITICAL

class LabOrderCreateRequest(BaseModel):
    master_patient_id: int
    encounter_id: Optional[int] = None
    test_name: str
    priority: str = "ROUTINE"  # ROUTINE, URGENT, STAT
    laboratory_name: str = "Central Diagnostic Laboratory"
    sample_type: Optional[str] = "Venous Blood"
    clinical_notes: Optional[str] = None

class LabSampleCollectRequest(BaseModel):
    sample_type: str = "Venous Blood"
    sample_notes: Optional[str] = None

class LabResultEntryRequest(BaseModel):
    results: List[LabResultItem]
    clinical_notes: Optional[str] = None

class LabOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    master_patient_id: int
    patient_name: Optional[str] = None
    patient_national_id: Optional[str] = None
    encounter_id: Optional[int] = None
    ordering_doctor_id: int
    ordering_doctor_name: Optional[str] = None
    test_name: str
    priority: str
    laboratory_name: str
    status: str
    sample_type: Optional[str] = None
    sample_collected_at: Optional[datetime] = None
    results_json: Optional[str] = None
    results: Optional[List[Any]] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    clinical_notes: Optional[str] = None
    created_at: datetime
