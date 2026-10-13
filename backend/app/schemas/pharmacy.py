from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class PrescriptionCreateRequest(BaseModel):
    master_patient_id: int
    encounter_id: Optional[int] = None
    medication_name: str
    strength: str
    dosage: str = "1 Tablet"
    route: str = "ORAL"
    frequency: str = "Twice daily after meals"
    duration: str = "14 Days"
    quantity_prescribed: int = 28
    instructions: Optional[str] = None

class DispenseMedicationRequest(BaseModel):
    dispensed_quantity: int
    batch_number: str = "B-2026-X9"
    counseling_notes: Optional[str] = "Take with plenty of water after meals."

class ClarificationRequest(BaseModel):
    clarification_notes: str

class DispensingRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prescription_id: int
    pharmacist_name: Optional[str] = None
    dispensed_quantity: int
    batch_number: str
    dispensed_at: datetime
    counseling_notes: Optional[str] = None

class PrescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prescription_number: str
    master_patient_id: int
    patient_name: Optional[str] = None
    patient_national_id: Optional[str] = None
    encounter_id: Optional[int] = None
    doctor_id: int
    doctor_name: Optional[str] = None
    medication_name: str
    strength: str
    dosage: str
    route: str
    frequency: str
    duration: str
    quantity_prescribed: int
    quantity_dispensed: int
    status: str
    clarification_notes: Optional[str] = None
    instructions: Optional[str] = None
    created_at: datetime
    dispensing_records: List[DispensingRecordResponse] = []
