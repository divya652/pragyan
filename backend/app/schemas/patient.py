from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

class PatientCreate(BaseModel):
    national_health_id: str
    first_name: str
    last_name: str
    dob: date
    gender: str
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class PatientUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class PatientDemographicsResponse(BaseModel):
    id: int
    national_health_id: str
    first_name: str
    last_name: str
    dob: date
    gender: str
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SourceRecordBrief(BaseModel):
    id: int
    organization_code: str
    organization_name: str
    source_system_patient_id: str
    match_status: str
    match_score: float
    ingested_at: datetime

    class Config:
        from_attributes = True
