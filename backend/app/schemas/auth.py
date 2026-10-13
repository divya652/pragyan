from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    full_name: str
    username: str
    linked_patient_id: Optional[int] = None
    doctor_id: Optional[int] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: str  # 'receptionist', 'doctor', 'patient', 'admin'
    department: Optional[str] = None
    license_number: Optional[str] = None
    specialty: Optional[str] = None

class UserRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    username: Optional[str] = None
    password: str
    role: str  # 'patient', 'doctor', 'receptionist'
    dob: Optional[str] = None  # YYYY-MM-DD for patients
    gender: Optional[str] = "OTHER"
    patient_id: Optional[str] = None  # ABHA or existing patient identifier
    staff_id: Optional[str] = None
    facility: Optional[str] = None
    license_number: Optional[str] = None
    specialty: Optional[str] = None


class UserStatusUpdate(BaseModel):
    is_active: bool

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
