import sys
from pathlib import Path

# Ensure backend root is in sys.path if run directly as a script
_backend_dir = str(Path(__file__).resolve().parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'receptionist', 'doctor', 'patient', 'admin'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    patient_profile = relationship("MasterPatient", back_populates="linked_user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="actor")
    notifications = relationship("Notification", back_populates="user")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)  # NMR / Medical Reg Number
    specialty = Column(String(100), nullable=False)
    additional_specialties = Column(String(200), nullable=True)
    verification_status = Column(String(30), default="PENDING_VERIFICATION", nullable=False)  # VERIFIED, PENDING_VERIFICATION, REJECTED
    qualifications = Column(String(200), default="MBBS", nullable=False)
    institution = Column(String(200), default="Premier Medical College", nullable=False)
    graduation_year = Column(Integer, default=2015, nullable=False)
    experience_years = Column(Integer, default=8, nullable=False)
    hospital = Column(String(150), default="Metro General Hospital", nullable=False)
    biography = Column(Text, nullable=True)
    profile_photo_url = Column(String(255), nullable=True)
    languages_spoken = Column(String(200), default="English, Hindi", nullable=False)
    consultation_fee = Column(Float, default=500.0, nullable=False)
    consultation_types = Column(String(100), default="IN_PERSON,ONLINE", nullable=False)  # IN_PERSON, ONLINE, BOTH
    clinic_address = Column(String(255), default="Suite 402, Metro Healthcare Complex", nullable=True)
    city = Column(String(100), default="Mumbai", nullable=True)

    user = relationship("User", back_populates="doctor_profile")
    patient_assignments = relationship("DoctorPatientAssignment", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")
    opd_encounters = relationship("OpdEncounter", back_populates="doctor")
    lab_orders = relationship("LabOrder", back_populates="doctor")
    prescriptions = relationship("PrescriptionOrder", back_populates="doctor")
    availabilities = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    blocked_periods = relationship("DoctorBlockedPeriod", back_populates="doctor", cascade="all, delete-orphan")

class DoctorPatientAssignment(Base):
    __tablename__ = "doctor_patient_assignments"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    relationship_type = Column(String(50), default="ATTENDING_PHYSICIAN")  # ATTENDING_PHYSICIAN, CONSULTANT, EMERGENCY
    is_emergency_override = Column(Boolean, default=False, nullable=False)

    doctor = relationship("Doctor", back_populates="patient_assignments")
    patient = relationship("MasterPatient", back_populates="doctor_assignments")


if __name__ == "__main__":
    print("User models (User, Doctor, DoctorPatientAssignment) loaded successfully.")

