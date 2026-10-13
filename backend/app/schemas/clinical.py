from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class ProvenanceInfo(BaseModel):
    organization_code: str
    organization_name: str
    recorded_at: datetime
    source_id: Optional[str] = None

class DiagnosisItem(BaseModel):
    id: int
    icd10_code: Optional[str] = None
    description: str
    severity: Optional[str] = None
    clinical_status: str
    onset_date: Optional[date] = None
    provenance: ProvenanceInfo

class AllergyItem(BaseModel):
    id: int
    allergen: str
    reaction: Optional[str] = None
    severity: str
    verification_status: str
    provenance: ProvenanceInfo

class MedicationItem(BaseModel):
    id: int
    medication_name: str
    dosage: str
    route: Optional[str] = None
    frequency: Optional[str] = None
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    prescriber_name: Optional[str] = None
    instructions: Optional[str] = None
    provenance: ProvenanceInfo

class LabResultItem(BaseModel):
    id: int
    test_name: str
    loinc_code: Optional[str] = None
    result_value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: str  # NORMAL, HIGH, LOW, CRITICAL
    test_date: datetime
    status: str
    comments: Optional[str] = None
    provenance: ProvenanceInfo

class RadiologyItem(BaseModel):
    id: int
    study_type: str
    modality: str
    body_region: str
    study_date: datetime
    status: str
    summary: str
    impression: str
    radiologist_name: Optional[str] = None
    image_url: str
    dicom_series_uid: Optional[str] = None
    provenance: ProvenanceInfo

class EncounterItem(BaseModel):
    id: int
    source_encounter_id: str
    encounter_type: str
    reason: Optional[str] = None
    provider_name: Optional[str] = None
    encounter_date: datetime
    discharge_date: Optional[datetime] = None
    department: Optional[str] = None
    clinical_notes: Optional[str] = None
    provenance: ProvenanceInfo

class TimelineEvent(BaseModel):
    event_id: str
    category: str  # ENCOUNTER, DIAGNOSIS, MEDICATION, ALLERGY, LAB_RESULT, RADIOLOGY
    title: str
    subtitle: Optional[str] = None
    event_date: datetime
    organization_code: str
    organization_name: str
    status: Optional[str] = None
    severity_or_flag: Optional[str] = None
    details: dict

class EncounterCreate(BaseModel):
    encounter_type: str
    reason: str
    encounter_date: datetime
    department: str
    clinical_notes: Optional[str] = None
    diagnoses: Optional[List[dict]] = []

class BreakGlassRequest(BaseModel):
    patient_id: int
    emergency_reason: str
    clinical_attestation: bool

class UnifiedChartResponse(BaseModel):
    patient_id: int
    national_health_id: str
    full_name: str
    dob: date
    gender: str
    blood_group: Optional[str] = None
    contributing_sources: List[str]
    active_conflicts_count: int
    consent_status: str
    is_emergency_override: Optional[bool] = False
    diagnoses: List[DiagnosisItem]
    allergies: List[AllergyItem]
    medications: List[MedicationItem]
    lab_results: List[LabResultItem]
    radiology: List[RadiologyItem] = []
    encounters: List[EncounterItem]

