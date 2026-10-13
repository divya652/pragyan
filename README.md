# Creating a Unified View of a Patient Across Systems

> **Enterprise Healthcare Interoperability & Zero-Trust Clinical Record Aggregation Platform**  
> *Consolidates distributed EHRs across healthcare institutions into a high-fidelity chronological clinical chart with backend-enforced RBAC, deterministic & probabilistic patient identity matching, transparent provenance, discrepancy detection, and patient consent governance.*

---

## 1. System Overview & Problem Statement

In modern healthcare ecosystems, a patient's medical records are fragmented across disparate hospital networks, ambulatory clinics, diagnostic laboratories, and retail pharmacies. This fragmentation causes adverse drug interactions, redundant diagnostic tests, delays in acute care, and patient identity confusion.

**"Creating a Unified View of a Patient Across Systems"** solves this by establishing a secure interoperability gateway that connects independent healthcare sources:
- **Hospital A (Metro General Hospital)**: Standard HL7 FHIR R4 JSON resources (`Patient`, `Condition`, `MedicationRequest`, `AllergyIntolerance`, `DiagnosticReport`, `Encounter`).
- **Hospital B (St. Jude Community Health)**: Proprietary Legacy EHR format with disparate schemas.

The platform normalizes both formats into a unified longitudinal clinical chart while upholding:
1. **Strict Role-Based Access Control (RBAC)**: Complete physical and logical segregation between administrative intake and Protected Health Information (PHI).
2. **Treatment Relationship Scope**: Clinicians can only inspect records for patients where an active care assignment or documented emergency override exists.
3. **Anti-False-Merge Identity Matching Engine**: Combines deterministic identifier verification with probabilistic scoring. Ambiguous congruence (60–84%) is held in an administrative review queue; **records are never merged purely on similar names**.
4. **Indelible Provenance & Conflict Detection**: Contradictory records (e.g. diverging allergy severities or conflicting medication dosages) are preserved with source facility attribution, timestamps, and flagged for clinician review without silent overwriting.
5. **Patient-Directed Consent Directives**: Patients govern cross-system sharing (Full Sharing, Emergency Only, or Revoked) and audit who has accessed their records.
6. **Immutable Audit Forensics**: All operations, searches, views, mutations, and denied access attempts are logged with actor, role, IP, and outcome.

---

## 2. Technology Stack & Prerequisites

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.14 / 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Uvicorn |
| **Security & Auth** | Argon2id / bcrypt, PyJWT (HS256 Bearer Tokens with expiration) |
| **Database** | SQLite (Default with Foreign Key PRAGMA enforcement) / PostgreSQL via `DATABASE_URL` |
| **Frontend** | React 19 / TypeScript, Vite, Tailwind CSS v4, Lucide Icons |
| **Testing** | Pytest, HTTPX, Starlette TestClient |

---

## 3. Demo Personas & Pre-Seeded Credentials

The platform provides a **Quick Demo Switcher** directly in the top navigation bar and login screen to test all roles seamlessly:

| Role | Username | Password | Purpose & Access Boundary |
| :--- | :--- | :--- | :--- |
| **Receptionist / Front Desk** | `receptionist` | `RecepPassword123!` | Administrative intake, registration queue, appointment scheduling. **Strictly denied (403) from accessing clinical charts or PHI.** |
| **Attending Doctor (Assigned)** | `doctor_mehta` | `DoctorPassword123!` | Dr. Arvind Mehta (Cardiology). Authorized to view Ananya Sharma's multi-hospital unified chart, timeline, and resolve discrepancies. |
| **Doctor (Unassigned Scope)** | `doctor_unassigned` | `DoctorPassword123!` | Dr. Sarah Jenkins (Neurology). Unassigned clinician. **Tests 403 Forbidden scope denial when attempting to access Ananya Sharma's chart.** |
| **Verified Patient** | `patient_ananya` | `PatientPassword123!` | Ananya Sharma. Personal patient portal: view own consolidated chart, manage sharing consent policies, and review access audit logs. |
| **System Administrator** | `admin` | `AdminPassword123!` | Eleanor Vance. Identity matching review queue (approve/reject link), user management, integration jobs, and security audit trail. |

---

## 4. Quick Start & Execution Guide

### 4.1 Backend Setup & Execution

```bash
# Navigate to the project root
cd unified-patient-view

# Activate Python Virtual Environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies (if not already installed)
pip install -r backend/requirements.txt

# Run Automated Test Suite (17 Security & Interop Tests)
python -m pytest backend/tests -v

# Start FastAPI Backend Server (Runs on port 8000)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API Swagger Documentation will be available at:  
👉 **http://127.0.0.1:8000/docs**

### 4.2 Frontend Setup & Execution

```bash
# In a separate terminal, navigate to the frontend directory:
cd unified-patient-view/frontend

# Install dependencies (if not already installed)
npm install

# Start Vite Development Server (Runs on port 5173)
npm run dev -- --host 127.0.0.1 --port 5173
```

Access the Web Application in your browser:  
👉 **http://127.0.0.1:5173**

---

## 5. Automated Security Test Results

The backend test suite (`backend/tests/`) executes 17 automated tests covering all requirements from Section 10 of the specification:

```text
============================== test session starts ==============================
collected 17 items

backend/tests/test_matching_engine.py::test_name_similarity_calculation PASSED     [  5%]
backend/tests/test_matching_engine.py::test_rule_never_merge_solely_on_name PASSED  [ 11%]
backend/tests/test_matching_engine.py::test_exact_match_on_national_id PASSED       [ 17%]
backend/tests/test_matching_engine.py::test_uncertain_match_flagged_for_review PASSED [ 23%]
backend/tests/test_rbac_security.py::test_01_unauthenticated_cannot_access_clinical_chart PASSED [ 29%]
backend/tests/test_rbac_security.py::test_02_receptionist_blocked_from_clinical_chart PASSED [ 35%]
backend/tests/test_rbac_security.py::test_03_receptionist_can_access_administrative_endpoints PASSED [ 41%]
backend/tests/test_rbac_security.py::test_04_doctor_outside_treatment_scope_blocked PASSED [ 47%]
backend/tests/test_rbac_security.py::test_05_assigned_doctor_can_access_clinical_chart PASSED [ 52%]
backend/tests/test_rbac_security.py::test_06_patient_cannot_access_other_patient_record PASSED [ 58%]
backend/tests/test_rbac_security.py::test_07_patient_can_view_own_records PASSED    [ 64%]
backend/tests/test_rbac_security.py::test_08_administrator_blocked_from_clinical_chart PASSED [ 70%]
backend/tests/test_rbac_security.py::test_09_patient_consent_revocation_enforced PASSED [ 76%]
backend/tests/test_rbac_security.py::test_10_audit_logs_record_events PASSED       [ 82%]
backend/tests/test_rbac_security.py::test_11_sql_injection_sanitization PASSED     [ 88%]
backend/tests/test_rbac_security.py::test_12_expired_token_rejected PASSED         [ 94%]
backend/tests/test_rbac_security.py::test_13_conflicts_detected_and_provenance_preserved PASSED [100%]

====================== 17 passed in 14.34s ======================
```

---

## 6. Demonstration Scenarios

### Scenario A: Administrative Intake with Clinical Isolation (Receptionist)
1. Sign in as `receptionist` or click "1. Receptionist / Front Desk".
2. View the administrative registry table. Notice only demographics (Name, DOB, Gender, Phone, Address, Emergency Contact) are shown. **No diagnoses, medications, or allergies exist on this page or in the network API payloads.**
3. Click "Register New Patient" and create a new patient with National Health ID `ABHA-9900-1122-3344`.
4. Switch to "Daily Appointment & Arrival Schedule" and update an arrival state to `CHECKED_IN`.

### Scenario B: Multi-Hospital Unified Chart & Discrepancy Resolution (Doctor)
1. Sign in as `doctor_mehta` or click "Doctor (Assigned)".
2. Notice patient Ananya Sharma (`ABHA-9821-4402-1190`) is displayed in the authorized care cohort.
3. Observe the Unified Header showing records contributing from **Metro General Hospital (FHIR)** and **St. Jude Community Health (Legacy EHR)**.
4. Review the amber **Cross-Institutional Discrepancies Detected** banner highlighting:
   - Prescriptions conflict: Metformin 500mg BID (Metro General) vs Metformin 1000mg Daily (St. Jude).
   - Allergy severity divergence: Penicillin Severe Anaphylaxis (Metro General) vs Penicillin Moderate (St. Jude).
5. Click "Resolve Discrepancy", provide a clinical explanation ("Patient confirmed current dosage is 500mg BID"), and document the resolution.
6. Explore the **Longitudinal Medical Timeline** with source facility filter (`HOSP_A`, `HOSP_B`, or All).

### Scenario C: Treatment Relationship Scope Enforcement (Negative Test)
1. Sign in as `doctor_unassigned` (Dr. Sarah Jenkins).
2. Attempting to view Ananya Sharma's clinical chart triggers a **403 Forbidden** Access Denied barrier with an alert explaining that Dr. Jenkins is not an assigned clinician. An unauthorized access audit event is simultaneously committed to the backend audit database.

### Scenario D: Patient Self-Service & Consent Governance (Patient)
1. Sign in as `patient_ananya` or click "Patient".
2. View the personal medical chart.
3. Switch to "Data-Sharing & Consent Directives". Change policy to `REVOKED` or `EMERGENCY_ONLY`.
4. Switch to "Doctor (Assigned)" in top nav: observe that the doctor's clinical chart view immediately respects the patient's revoked directive. Switch back and restore `FULL_SHARING`.
5. In Patient Portal, switch to "Access Audit Log" to inspect every date, provider name, and role that accessed her records.

### Scenario E: Identity Matching Review & Security Forensics (Administrator)
1. Sign in as `admin` or click "Admin".
2. View the live operational metrics derived from the database.
3. Switch to "Identity Matching Review Queue": inspect candidate match for Anita Sharma vs Ananya Sharma. View the explainable criteria score (70% match) and decide to "Reject Link" or "Authorize Merge".
4. Switch to "Security Audit Forensics" and filter by `DENIED` outcomes to inspect unauthorized probes.

---

## 7. Known Limitations & Real-World Extensions

- **External Healthcare Network Connectors**: The current deployment uses validated, realistic synthetic datasets representing Hospital A (HL7 FHIR R4) and Hospital B (Proprietary Legacy EHR). Connecting to production national health exchanges (e.g. ABDM / NDHM in India or TEFCA in the US) requires registration with certified Health Information Exchange (HIE) gateways and mutual TLS (mTLS).
- **Automated Master Patient Index (MPI) Scalability**: For tens of millions of records, the pairwise probabilistic matching engine can be backed by vector databases or distributed indexing (Elasticsearch / OpenSearch).
