from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, Time, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class DoctorAvailability(Base):
    """Recurring weekly availability slots for a doctor."""
    __tablename__ = "doctor_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday … 6=Sunday
    start_time = Column(String(10), nullable=False)  # e.g. "09:00"
    end_time = Column(String(10), nullable=False)    # e.g. "17:00"
    slot_duration_minutes = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    doctor = relationship("Doctor", back_populates="availabilities")


class DoctorBlockedPeriod(Base):
    """Date ranges when a doctor is unavailable (leave, conference, etc.)."""
    __tablename__ = "doctor_blocked_periods"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    doctor = relationship("Doctor", back_populates="blocked_periods")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(String(20), nullable=False)  # "09:30 AM"
    department = Column(String(100), nullable=False)
    reason = Column(String(255), nullable=True)
    status = Column(String(30), default="SCHEDULED", nullable=False)  # SCHEDULED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED
    notes = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("MasterPatient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    created_by = relationship("User")
