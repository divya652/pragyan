export type UserRole = 
  | 'receptionist' 
  | 'doctor' 
  | 'patient' 
  | 'admin' 
  | 'lab_technician' 
  | 'pharmacist' 
  | 'cashier';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  linked_patient_id?: number | null;
  doctor_id?: number | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  user_id: number;
  full_name: string;
  username: string;
  linked_patient_id?: number | null;
  doctor_id?: number | null;
}

export interface DoctorProfile {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  license_number: string;
  nmr_registration_number?: string;
  specialty: string;
  additional_specialties?: string | null;
  verification_status: 'VERIFIED' | 'PENDING_VERIFICATION' | 'REJECTED';
  qualifications: string;
  institution: string;
  graduation_year: number;
  experience_years: number;
  hospital: string;
  biography?: string | null;
  profile_photo_url?: string | null;
  languages_spoken?: string | null;
  consultation_fee?: number | null;
  consultation_types?: string | null;
  city?: string | null;
  clinic_address?: string | null;
}

export interface PatientSearchCandidate {
  id: number;
  national_health_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  dob: string;
  gender: string;
  phone?: string | null;
  contact_number?: string | null;
  blood_group?: string | null;
  address?: any;
  guardian_name?: string | null;
  is_assigned: boolean;
  active_encounter_token?: string | null;
  total_encounters: number;
}

export interface PatientDemographics {
  id: number;
  national_health_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  blood_group?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
  open_conflicts_count?: number;
}

export interface ProvenanceInfo {
  organization_code: string;
  organization_name: string;
  recorded_at: string;
  source_id?: string;
}

export interface DiagnosisItem {
  id: number;
  icd10_code?: string;
  description: string;
  severity?: string;
  clinical_status: string;
  onset_date?: string;
  provenance: ProvenanceInfo;
}

export interface AllergyItem {
  id: number;
  allergen: string;
  reaction?: string;
  severity: string;
  verification_status: string;
  provenance: ProvenanceInfo;
}

export interface MedicationItem {
  id: number;
  medication_name: string;
  dosage: string;
  route?: string;
  frequency?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  prescriber_name?: string;
  instructions?: string;
  provenance: ProvenanceInfo;
}

export interface LabResultItem {
  id: number;
  test_name: string;
  loinc_code?: string;
  result_value: string;
  unit?: string;
  reference_range?: string;
  flag: string; // NORMAL, HIGH, LOW, CRITICAL
  test_date: string;
  status: string;
  comments?: string;
  provenance: ProvenanceInfo;
}

export interface RadiologyItem {
  id: number;
  study_type: string;
  modality: string;
  body_region: string;
  study_date: string;
  status: string;
  summary: string;
  impression: string;
  radiologist_name?: string;
  image_url: string;
  dicom_series_uid?: string;
  provenance: ProvenanceInfo;
}

export interface EncounterItem {
  id: number;
  source_encounter_id: string;
  encounter_type: string;
  reason?: string;
  provider_name?: string;
  encounter_date: string;
  discharge_date?: string;
  department?: string;
  clinical_notes?: string;
  provenance: ProvenanceInfo;
}

export interface UnifiedChart {
  master_patient_id: number;
  patient_id?: number;
  national_health_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  dob: string;
  gender: string;
  blood_group?: string;
  phone?: string;
  allergies_missing_or_unverified: boolean;
  diagnoses: DiagnosisItem[];
  allergies: AllergyItem[];
  medications: MedicationItem[];
  lab_results: LabResultItem[];
  radiology_studies: RadiologyItem[];
  radiology?: RadiologyItem[];
  encounters: EncounterItem[];
  contributing_sources: string[];
  active_conflicts_count?: number;
  consent_status?: string;
  is_emergency_override?: boolean;
  data_sources?: {
    code: string;
    name: string;
    system_type: string;
    last_sync: string;
  }[];
}

// OPD Encounter & Queue Token
export interface OpdEncounter {
  id: number;
  master_patient_id: number;
  patient_name?: string;
  patient_national_id?: string;
  patient_gender?: string;
  patient_dob?: string;
  patient_phone?: string;
  doctor_id?: number | null;
  doctor_name?: string | null;
  department: string;
  token_number: string;
  visit_type: string;
  status: 'REGISTERED' | 'CHECKED_IN' | 'WAITING' | 'WITH_DOCTOR' | 'CONSULTATION_COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  arrival_time: string;
  consultation_start_time?: string | null;
  consultation_end_time?: string | null;
  vitals_bp?: string | null;
  vitals_pulse?: string | null;
  vitals_temp?: string | null;
  vitals_spo2?: string | null;
  chief_complaint?: string | null;
  clinical_notes?: string | null;
  bill_id?: number | null;
  bill_status?: string | null;
  created_at: string;
}

// Lab Orders & Workflow
export interface LabResultParameter {
  parameter: string;
  result_value: string;
  unit?: string;
  reference_range?: string;
  flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
}

export interface LabOrder {
  id: number;
  order_number: string;
  master_patient_id: number;
  patient_name?: string;
  patient_national_id?: string;
  encounter_id?: number | null;
  ordering_doctor_id: number;
  ordering_doctor_name?: string;
  test_name: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  laboratory_name: string;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'AWAITING_VERIFICATION' | 'VERIFIED' | 'PUBLISHED' | 'CANCELLED';
  sample_type?: string | null;
  sample_collected_at?: string | null;
  results_json?: string | null;
  results?: LabResultParameter[] | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  clinical_notes?: string | null;
  created_at: string;
}

// Pharmacy & Prescriptions
export interface DispensingRecord {
  id: number;
  prescription_id: number;
  pharmacist_name?: string;
  dispensed_quantity: number;
  batch_number: string;
  dispensed_at: string;
  counseling_notes?: string | null;
}

export interface PrescriptionOrder {
  id: number;
  prescription_number: string;
  master_patient_id: number;
  patient_name?: string;
  patient_national_id?: string;
  encounter_id?: number | null;
  doctor_id: number;
  doctor_name?: string;
  medication_name: string;
  strength: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
  status: 'ISSUED' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'CLARIFICATION_REQUIRED' | 'CANCELLED';
  clarification_notes?: string | null;
  instructions?: string | null;
  created_at: string;
  dispensing_records: DispensingRecord[];
}

// Billing & Payments
export interface BillItem {
  id: number;
  item_description: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface PaymentTransaction {
  id: number;
  transaction_ref: string;
  bill_id: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  receipt_number: string;
  is_verified: boolean;
  notes?: string | null;
  created_at: string;
}

export interface Bill {
  id: number;
  bill_number: string;
  master_patient_id: number;
  patient_name?: string;
  patient_national_id?: string;
  encounter_id?: number | null;
  bill_type: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_payable: number;
  amount_paid: number;
  balance_due: number;
  status: 'DRAFT' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  notes?: string | null;
  created_at: string;
  items: BillItem[];
  payments: PaymentTransaction[];
}

// In-App Notifications
export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  category: 'APPOINTMENT' | 'LAB_REPORT' | 'PRESCRIPTION' | 'BILLING' | 'SECURITY';
  is_read: boolean;
  link_url?: string | null;
  created_at: string;
}

// Unified Timeline Event
export interface UnifiedTimelineEvent {
  event_type: string;
  title: string;
  department: string;
  timestamp: string;
  actor: string;
  status: string;
  details?: string;
}

export interface TimelineEvent {
  event_id: string;
  category: string;
  title: string;
  subtitle?: string | null;
  event_date: string;
  organization_code: string;
  organization_name: string;
  status?: string | null;
  severity_or_flag?: string | null;
  details?: any;
}

export interface DataConflict {
  id: number;
  master_patient_id: number;
  conflict_category: string;
  field_name: string;
  source_a_org_id?: number;
  source_a_org_code?: string;
  source_a_org_name: string;
  source_a_value: string;
  source_a_timestamp?: string;
  source_b_org_id?: number;
  source_b_org_code?: string;
  source_b_org_name: string;
  source_b_value: string;
  source_b_timestamp?: string;
  resolution_status: string;
  resolution_notes?: string;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface MatchCandidate {
  id: number;
  source_record_id: number;
  source_demographics: {
    first_name: string;
    last_name: string;
    dob: string;
    phone?: string | null;
  };
  source_organization_name: string;
  source_patient_id: string;
  candidate_master_patient_id: number;
  candidate_name: string;
  candidate_national_health_id: string;
  candidate_dob: string;
  candidate_phone?: string | null;
  match_score: number;
  match_criteria: Record<string, any>;
  status: string;
}

export interface AuditLogItem {
  id: number;
  created_at: string;
  action: string;
  actor_username?: string;
  actor_role: string;
  resource_type: string;
  resource_id?: string | null;
  outcome: string;
  ip_address?: string;
  details?: Record<string, any>;
}

export interface AdminStats {
  users_count: number;
  patients_count: number;
  appointments_count: number;
  pending_matches_count: number;
  open_conflicts_count: number;
  unauthorized_attempts_count: number;
}

export interface ConsentDirective {
  id: number;
  consent_type: string;
  valid_from: string;
  status: string;
  notes?: string;
  [key: string]: any;
}

export interface Appointment {
  id: number;
  master_patient_id: number;
  patient_name?: string;
  doctor_id: number;
  doctor_name?: string;
  department: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  [key: string]: any;
}
