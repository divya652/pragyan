from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class HealthcareOrganization(Base):
    __tablename__ = "healthcare_organizations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # 'HOSP_A', 'HOSP_B'
    name = Column(String(150), nullable=False)
    system_type = Column(String(50), nullable=False)  # 'FHIR_R4', 'LEGACY_EHR', 'LAB_SYSTEM'
    contact_email = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    source_records = relationship("SourcePatientRecord", back_populates="organization")
    clinical_encounters = relationship("ClinicalEncounter", back_populates="organization")
    clinical_diagnoses = relationship("ClinicalDiagnosis", back_populates="organization")
    clinical_allergies = relationship("ClinicalAllergy", back_populates="organization")
    clinical_medications = relationship("ClinicalMedication", back_populates="organization")
    clinical_labs = relationship("ClinicalLabResult", back_populates="organization")
    clinical_radiology = relationship("ClinicalRadiology", back_populates="organization")
    patient_consents = relationship("PatientConsent", back_populates="organization")
    integration_jobs = relationship("IntegrationJob", back_populates="organization")
