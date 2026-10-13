from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from app.database import Base

class MasterPatient(Base):
    __tablename__ = "master_patients"

    id = Column(Integer, primary_key=True, index=True)
    national_health_id = Column(String(50), unique=True, index=True, nullable=False)  # ABHA / NHID
    first_name = Column(String(100), nullable=False, index=True)
    last_name = Column(String(100), nullable=False, index=True)
    dob = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    blood_group = Column(String(10), nullable=True)
    phone = Column(String(20), index=True, nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    linked_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True)

    linked_user = relationship("User", back_populates="patient_profile")
    source_records = relationship("SourcePatientRecord", back_populates="master_patient")
    doctor_assignments = relationship("DoctorPatientAssignment", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    clinical_encounters = relationship("ClinicalEncounter", back_populates="master_patient")
    clinical_diagnoses = relationship("ClinicalDiagnosis", back_populates="master_patient")
    clinical_allergies = relationship("ClinicalAllergy", back_populates="master_patient")
    clinical_medications = relationship("ClinicalMedication", back_populates="master_patient")
    clinical_labs = relationship("ClinicalLabResult", back_populates="master_patient")
    clinical_radiology = relationship("ClinicalRadiology", back_populates="master_patient")
    consents = relationship("PatientConsent", back_populates="master_patient")
    conflicts = relationship("DataConflict", back_populates="master_patient")
    opd_encounters = relationship("OpdEncounter", back_populates="patient", cascade="all, delete-orphan")
    lab_orders = relationship("LabOrder", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("PrescriptionOrder", back_populates="patient", cascade="all, delete-orphan")
    bills = relationship("Bill", back_populates="patient", cascade="all, delete-orphan")

class SourcePatientRecord(Base):
    __tablename__ = "source_patient_records"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=True, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    source_system_patient_id = Column(String(100), nullable=False, index=True)
    raw_demographics_json = Column(Text, nullable=False)  # JSON string of raw intake payload
    match_status = Column(String(30), default="MATCHED", nullable=False)  # MATCHED, PENDING_REVIEW, UNLINKED
    match_score = Column(Float, default=1.0, nullable=False)
    match_criteria_json = Column(Text, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    master_patient = relationship("MasterPatient", back_populates="source_records")
    organization = relationship("HealthcareOrganization", back_populates="source_records")
    match_candidates = relationship("IdentityMatchCandidate", back_populates="source_record")

class IdentityMatchCandidate(Base):
    __tablename__ = "identity_match_candidates"

    id = Column(Integer, primary_key=True, index=True)
    source_record_id = Column(Integer, ForeignKey("source_patient_records.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    match_score = Column(Float, nullable=False)
    match_criteria_json = Column(Text, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    source_record = relationship("SourcePatientRecord", back_populates="match_candidates")
    candidate_master_patient = relationship("MasterPatient")
    reviewed_by = relationship("User")
