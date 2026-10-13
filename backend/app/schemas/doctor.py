from pydantic import BaseModel, ConfigDict
from typing import Optional

class DoctorProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    full_name: str
    email: str
    department: str
    license_number: str
    specialty: str
    additional_specialties: Optional[str] = None
    verification_status: str  # VERIFIED, PENDING_VERIFICATION, REJECTED
    qualifications: str
    institution: str
    graduation_year: int
    experience_years: int
    hospital: str
    biography: Optional[str] = None
    profile_photo_url: Optional[str] = None
    languages_spoken: Optional[str] = None
    consultation_fee: Optional[float] = None
    consultation_types: Optional[str] = None
    city: Optional[str] = None
    clinic_address: Optional[str] = None

class DoctorVerificationRequest(BaseModel):
    doctor_id: int
    status: str  # VERIFIED, REJECTED
    review_notes: Optional[str] = None
