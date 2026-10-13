from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class ClinicalEncounter(Base):
    __tablename__ = "clinical_encounters"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    source_encounter_id = Column(String(100), nullable=False)
    encounter_type = Column(String(50), nullable=False)  # INPATIENT, OUTPATIENT, EMERGENCY, AMBULATORY
    reason = Column(String(255), nullable=True)
    provider_name = Column(String(100), nullable=True)
    encounter_date = Column(DateTime, nullable=False)
    discharge_date = Column(DateTime, nullable=True)
    department = Column(String(100), nullable=True)
    clinical_notes = Column(Text, nullable=True)
    raw_json = Column(Text, nullable=True)

    master_patient = relationship("MasterPatient", back_populates="clinical_encounters")
    organization = relationship("HealthcareOrganization", back_populates="clinical_encounters")
    diagnoses = relationship("ClinicalDiagnosis", back_populates="encounter")

class ClinicalDiagnosis(Base):
    __tablename__ = "clinical_diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("clinical_encounters.id", ondelete="SET NULL"), nullable=True)
    icd10_code = Column(String(20), nullable=True, index=True)
    description = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=True)  # MILD, MODERATE, SEVERE
    clinical_status = Column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, RESOLVED, RECURRENCE
    onset_date = Column(Date, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    master_patient = relationship("MasterPatient", back_populates="clinical_diagnoses")
    organization = relationship("HealthcareOrganization", back_populates="clinical_diagnoses")
    encounter = relationship("ClinicalEncounter", back_populates="diagnoses")

class ClinicalAllergy(Base):
    __tablename__ = "clinical_allergies"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    allergen = Column(String(150), nullable=False, index=True)
    reaction = Column(String(255), nullable=True)
    severity = Column(String(50), nullable=False)  # MILD, MODERATE, SEVERE, LIFE_THREATENING
    verification_status = Column(String(30), default="CONFIRMED", nullable=False)  # CONFIRMED, UNCONFIRMED, REFUTED
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    master_patient = relationship("MasterPatient", back_populates="clinical_allergies")
    organization = relationship("HealthcareOrganization", back_populates="clinical_allergies")

class ClinicalMedication(Base):
    __tablename__ = "clinical_medications"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    medication_name = Column(String(150), nullable=False, index=True)
    dosage = Column(String(100), nullable=False)
    route = Column(String(50), default="ORAL", nullable=True)  # ORAL, INTRAVENOUS, TOPICAL, INHALATION
    frequency = Column(String(100), nullable=True)  # ONCE_DAILY, TWICE_DAILY, AS_NEEDED
    status = Column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, STOPPED
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    prescriber_name = Column(String(100), nullable=True)
    instructions = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    master_patient = relationship("MasterPatient", back_populates="clinical_medications")
    organization = relationship("HealthcareOrganization", back_populates="clinical_medications")

class ClinicalLabResult(Base):
    __tablename__ = "clinical_lab_results"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    test_name = Column(String(150), nullable=False, index=True)
    loinc_code = Column(String(30), nullable=True, index=True)
    result_value = Column(String(100), nullable=False)
    unit = Column(String(50), nullable=True)
    reference_range = Column(String(100), nullable=True)
    flag = Column(String(30), default="NORMAL", nullable=False)  # NORMAL, HIGH, LOW, CRITICAL
    test_date = Column(DateTime, nullable=False)
    status = Column(String(30), default="FINAL", nullable=False)  # PRELIMINARY, FINAL
    comments = Column(Text, nullable=True)

    master_patient = relationship("MasterPatient", back_populates="clinical_labs")
    organization = relationship("HealthcareOrganization", back_populates="clinical_labs")

class ClinicalRadiology(Base):
    __tablename__ = "clinical_radiology"

    id = Column(Integer, primary_key=True, index=True)
    master_patient_id = Column(Integer, ForeignKey("master_patients.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("healthcare_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    study_type = Column(String(150), nullable=False, index=True)  # e.g. "Chest Radiograph PA & Lateral", "Brain MRI T1/T2 Axial"
    modality = Column(String(50), nullable=False)  # CR, MR, CT, US
    body_region = Column(String(100), nullable=False)  # Chest, Brain, Abdomen, Cardiac
    study_date = Column(DateTime, nullable=False)
    status = Column(String(30), default="FINAL", nullable=False)
    summary = Column(Text, nullable=False)
    impression = Column(Text, nullable=False)
    radiologist_name = Column(String(100), nullable=True)
    image_url = Column(String(255), nullable=False)
    dicom_series_uid = Column(String(100), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    master_patient = relationship("MasterPatient", back_populates="clinical_radiology")
    organization = relationship("HealthcareOrganization", back_populates="clinical_radiology")

