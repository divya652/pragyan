from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class OpdRegistrationRequest(BaseModel):
    master_patient_id: int
    doctor_id: Optional[int] = None
    department: str
    visit_type: str = "WALK_IN"  # WALK_IN, APPOINTMENT
    vitals_bp: Optional[str] = "120/80 mmHg"
    vitals_pulse: Optional[str] = "76 bpm"
    vitals_temp: Optional[str] = "98.4 F"
    vitals_spo2: Optional[str] = "99%"
    chief_complaint: Optional[str] = None
    consultation_fee: float = 500.0

class OpdStatusUpdateRequest(BaseModel):
    status: str  # CHECKED_IN, WAITING, WITH_DOCTOR, CONSULTATION_COMPLETED, CANCELLED, NO_SHOW
    clinical_notes: Optional[str] = None

class OpdEncounterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    master_patient_id: int
    patient_name: Optional[str] = None
    patient_national_id: Optional[str] = None
    patient_gender: Optional[str] = None
    patient_dob: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    department: str
    token_number: str
    visit_type: str
    status: str
    arrival_time: datetime
    consultation_start_time: Optional[datetime] = None
    consultation_end_time: Optional[datetime] = None
    vitals_bp: Optional[str] = None
    vitals_pulse: Optional[str] = None
    vitals_temp: Optional[str] = None
    vitals_spo2: Optional[str] = None
    chief_complaint: Optional[str] = None
    clinical_notes: Optional[str] = None
    bill_id: Optional[int] = None
    bill_status: Optional[str] = None
    created_at: datetime
