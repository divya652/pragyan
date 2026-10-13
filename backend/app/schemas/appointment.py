from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class AppointmentCreate(BaseModel):
    master_patient_id: int
    doctor_id: Optional[int] = None
    appointment_date: date
    appointment_time: str
    department: str
    reason: Optional[str] = None
    notes: Optional[str] = None

class AppointmentStatusUpdate(BaseModel):
    status: str  # SCHEDULED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED
    notes: Optional[str] = None

AppointmentUpdateStatus = AppointmentStatusUpdate

class AppointmentResponse(BaseModel):
    id: int
    master_patient_id: int
    patient_name: str
    patient_national_id: str
    patient_phone: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    appointment_date: date
    appointment_time: str
    department: str
    reason: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
