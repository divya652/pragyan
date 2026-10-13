import os
import json
from datetime import datetime, date
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.user import User, Doctor, DoctorPatientAssignment
from app.models.organization import HealthcareOrganization
from app.models.patient import MasterPatient
from app.models.appointment import Appointment
from app.models.consent import PatientConsent
from app.models.clinical import ClinicalRadiology, ClinicalLabResult, ClinicalMedication, ClinicalDiagnosis
from app.models.opd import OpdEncounter
from app.models.lab import LabOrder
from app.models.pharmacy import PrescriptionOrder, DispensingRecord
from app.models.billing import Bill, BillItem, PaymentTransaction
from app.models.notification import Notification
from app.security import hash_password
from app.services.normalizer_service import (
    normalize_and_import_hospital_a_fhir,
    normalize_and_import_hospital_b_legacy
)

def seed_initial_data():
    db = SessionLocal()
    try:
        # 1. Healthcare Organizations
        org_a = db.query(HealthcareOrganization).filter(HealthcareOrganization.code == "HOSP_A").first()
        if not org_a:
            org_a = HealthcareOrganization(
                code="HOSP_A",
                name="Metro General Hospital (Cardio & Multi-Specialty)",
                system_type="FHIR_R4",
                contact_email="interop@metrohospital.org",
                is_active=True
            )
            db.add(org_a)

        org_b = db.query(HealthcareOrganization).filter(HealthcareOrganization.code == "HOSP_B").first()
        if not org_b:
            org_b = HealthcareOrganization(
                code="HOSP_B",
                name="St. Jude Community Health Center",
                system_type="LEGACY_EHR",
                contact_email="records@stjudehealth.org",
                is_active=True
            )
            db.add(org_b)
        db.commit()

        # 2. Staff & User Accounts across ALL 7 ROLES
        users_to_create = [
            {
                "username": "admin",
                "email": "admin@hospital-system.org",
                "full_name": "Eleanor Vance (Hospital Administrator)",
                "password": "AdminPassword123!",
                "role": "admin"
            },
            {
                "username": "receptionist",
                "email": "reception@hospital-system.org",
                "full_name": "Rajesh Kumar (Front Desk & OPD)",
                "password": "RecepPassword123!",
                "role": "receptionist"
            },
            {
                "username": "doctor_mehta",
                "email": "dr.mehta@hospital-system.org",
                "full_name": "Dr. Arvind Mehta",
                "password": "DoctorPassword123!",
                "role": "doctor",
                "department": "Cardiology & Internal Medicine",
                "license_number": "NMR-CARDIO-88190",
                "specialty": "Interventional Cardiology",
                "additional_specialties": "General Medicine, Hypertension Care",
                "verification_status": "VERIFIED",
                "qualifications": "MBBS, MD (Medicine), DM (Cardiology)",
                "institution": "All India Institute of Medical Sciences (AIIMS)",
                "graduation_year": 2010,
                "experience_years": 16,
                "hospital": "Metro General Hospital",
                "biography": "Senior Consultant Cardiologist specializing in acute coronary syndromes, preventive cardiology, and lipidology."
            },
            {
                "username": "doctor_gupta",
                "email": "dr.gupta@hospital-system.org",
                "full_name": "Dr. Rajesh Gupta",
                "password": "DoctorPassword123!",
                "role": "doctor",
                "department": "General Medicine",
                "license_number": "NMR-GEN-99014",
                "specialty": "General Medicine",
                "additional_specialties": "Diabetology",
                "verification_status": "PENDING_VERIFICATION",  # Demonstrating credential verification workflow!
                "qualifications": "MBBS, DNB (Internal Medicine)",
                "institution": "Grant Medical College",
                "graduation_year": 2018,
                "experience_years": 7,
                "hospital": "Metro General Hospital",
                "biography": "Consultant Physician with focus on chronic metabolic disorders and community health."
            },
            {
                "username": "doctor_unassigned",
                "email": "dr.jenkins@hospital-system.org",
                "full_name": "Dr. Sarah Jenkins",
                "password": "DoctorPassword123!",
                "role": "doctor",
                "department": "Neurology",
                "license_number": "NMR-NEURO-77201",
                "specialty": "Clinical Neurology",
                "additional_specialties": "Stroke Care",
                "verification_status": "VERIFIED",
                "qualifications": "MBBS, MD (Neurology)",
                "institution": "King George's Medical University",
                "graduation_year": 2013,
                "experience_years": 12,
                "hospital": "Metro General Hospital",
                "biography": "Consultant Neurologist specializing in neurodegenerative conditions."
            },
            {
                "username": "lab_tech",
                "email": "lab.tech@hospital-system.org",
                "full_name": "Vikram Deshmukh (Lab Technician)",
                "password": "LabPassword123!",
                "role": "lab_technician"
            },
            {
                "username": "pharmacist",
                "email": "pharmacist@hospital-system.org",
                "full_name": "Sunita Rao (Lead Pharmacist)",
                "password": "PharmPassword123!",
                "role": "pharmacist"
            },
            {
                "username": "cashier",
                "email": "billing@hospital-system.org",
                "full_name": "Amit Verma (Hospital Cashier)",
                "password": "CashierPassword123!",
                "role": "cashier"
            },
            {
                "username": "patient_ananya",
                "email": "ananya.sharma@example.com",
                "full_name": "Ananya Sharma (Verified Patient)",
                "password": "PatientPassword123!",
                "role": "patient"
            },
            {
                "username": "patient_neha",
                "email": "neha.sharma@example.com",
                "full_name": "Neha Sharma (Patient)",
                "password": "PatientPassword123!",
                "role": "patient"
            }
        ]

        created_users = {}
        for u_data in users_to_create:
            existing = db.query(User).filter(User.username == u_data["username"]).first()
            if not existing:
                u = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    hashed_password=hash_password(u_data["password"]),
                    role=u_data["role"],
                    is_active=True
                )
                db.add(u)
                db.flush()
                created_users[u_data["username"]] = u

                if u_data["role"] == "doctor":
                    doc = Doctor(
                        user_id=u.id,
                        department=u_data.get("department", "General Medicine"),
                        license_number=u_data.get("license_number", f"NMR-{u.id}"),
                        specialty=u_data.get("specialty", "General Medicine"),
                        additional_specialties=u_data.get("additional_specialties"),
                        verification_status=u_data.get("verification_status", "PENDING_VERIFICATION"),
                        qualifications=u_data.get("qualifications", "MBBS"),
                        institution=u_data.get("institution", "Medical Institute"),
                        graduation_year=u_data.get("graduation_year", 2015),
                        experience_years=u_data.get("experience_years", 8),
                        hospital=u_data.get("hospital", "Metro General Hospital"),
                        biography=u_data.get("biography")
                    )
                    db.add(doc)
            else:
                created_users[u_data["username"]] = existing
        db.commit()

        # 3. Ingest Simulated Datasets (FHIR & Legacy)
        base_dir = os.path.dirname(__file__)
        fhir_path = os.path.join(base_dir, "hospital_a_fhir.json")
        legacy_path = os.path.join(base_dir, "hospital_b_legacy.json")

        existing_patients = db.query(MasterPatient).count()
        if existing_patients == 0:
            if os.path.exists(fhir_path):
                with open(fhir_path, "r", encoding="utf-8") as f:
                    fhir_bundle = json.load(f)
                    normalize_and_import_hospital_a_fhir(db, org_a, fhir_bundle)

            if os.path.exists(legacy_path):
                with open(legacy_path, "r", encoding="utf-8") as f:
                    legacy_data = json.load(f)
                    for pat_payload in legacy_data.get("patients", []):
                        normalize_and_import_hospital_b_legacy(db, org_b, pat_payload)

        # 4. Link Ananya Sharma patient profile
        ananya_patient = db.query(MasterPatient).filter(
            MasterPatient.national_health_id == "ABHA-9821-4402-1190"
        ).first()

        patient_user = created_users.get("patient_ananya") or db.query(User).filter(User.username == "patient_ananya").first()
        if ananya_patient and patient_user and not ananya_patient.linked_user_id:
            ananya_patient.linked_user_id = patient_user.id
            db.commit()

        # 5. Create Demonstration Patients: Neha Sharma and Neha Patel (for safe disambiguation search!)
        neha_sharma = db.query(MasterPatient).filter(MasterPatient.national_health_id == "ABHA-1122-3344-5566").first()
        if not neha_sharma:
            neha_sharma = MasterPatient(
                national_health_id="ABHA-1122-3344-5566",
                first_name="Neha",
                last_name="Sharma",
                dob=date(1992, 5, 14),
                gender="FEMALE",
                blood_group="B+",
                phone="+91-98765-43210",
                email="neha.sharma@example.com",
                address="45 Park Avenue, Bangalore, Karnataka",
                emergency_contact_name="Aakash Sharma (Husband)",
                emergency_contact_phone="+91-98765-43211",
                linked_user_id=created_users.get("patient_neha").id if "patient_neha" in created_users else None
            )
            db.add(neha_sharma)
            db.commit()

        neha_patel = db.query(MasterPatient).filter(MasterPatient.national_health_id == "ABHA-7788-9900-1122").first()
        if not neha_patel:
            neha_patel = MasterPatient(
                national_health_id="ABHA-7788-9900-1122",
                first_name="Neha",
                last_name="Patel",
                dob=date(1988, 11, 20),
                gender="FEMALE",
                blood_group="O+",
                phone="+91-91234-56789",
                email="neha.patel@example.com",
                address="12 MG Road, Ahmedabad, Gujarat",
                emergency_contact_name="Vikram Patel (Brother)",
                emergency_contact_phone="+91-91234-56780"
            )
            db.add(neha_patel)
            db.commit()

        # 6. Assign Dr. Mehta as Authorized Treating Clinician for Ananya Sharma and Neha Sharma
        dr_mehta = db.query(Doctor).join(User).filter(User.username == "doctor_mehta").first()
        dr_gupta = db.query(Doctor).join(User).filter(User.username == "doctor_gupta").first()
        
        if dr_mehta and ananya_patient:
            existing_assignment = db.query(DoctorPatientAssignment).filter(
                DoctorPatientAssignment.doctor_id == dr_mehta.id,
                DoctorPatientAssignment.patient_id == ananya_patient.id
            ).first()
            if not existing_assignment:
                db.add(DoctorPatientAssignment(
                    doctor_id=dr_mehta.id,
                    patient_id=ananya_patient.id,
                    active=True,
                    relationship_type="ATTENDING_CARDIOLOGIST"
                ))
                db.commit()

        if dr_gupta and neha_sharma:
            existing_neha_assign = db.query(DoctorPatientAssignment).filter(
                DoctorPatientAssignment.doctor_id == dr_gupta.id,
                DoctorPatientAssignment.patient_id == neha_sharma.id
            ).first()
            if not existing_neha_assign:
                db.add(DoctorPatientAssignment(
                    doctor_id=dr_gupta.id,
                    patient_id=neha_sharma.id,
                    active=True,
                    relationship_type="ATTENDING_PHYSICIAN"
                ))
                db.commit()

        # 7. Seed Appointments
        if ananya_patient and dr_mehta:
            existing_appt = db.query(Appointment).filter(
                Appointment.master_patient_id == ananya_patient.id
            ).first()
            if not existing_appt:
                db.add(Appointment(
                    master_patient_id=ananya_patient.id,
                    doctor_id=dr_mehta.id,
                    appointment_date=date.today(),
                    appointment_time="10:30 AM",
                    department="Cardiology & Internal Medicine",
                    reason="Comprehensive Cross-System Medical Review & Follow-up",
                    status="CHECKED_IN",
                    notes="Patient checked in by front desk receptionist Rajesh Kumar."
                ))
                db.commit()

        # 8. Seed Default Patient Consent
        if ananya_patient:
            existing_consent = db.query(PatientConsent).filter(
                PatientConsent.master_patient_id == ananya_patient.id
            ).first()
            if not existing_consent:
                db.add(PatientConsent(
                    master_patient_id=ananya_patient.id,
                    consent_type="FULL_SHARING",
                    purpose="TREATMENT",
                    status="ACTIVE",
                    notes="Patient consented to multi-hospital record consolidation under EHR Interoperability Directive."
                ))
                db.commit()

        if neha_sharma:
            existing_consent = db.query(PatientConsent).filter(
                PatientConsent.master_patient_id == neha_sharma.id
            ).first()
            if not existing_consent:
                db.add(PatientConsent(
                    master_patient_id=neha_sharma.id,
                    consent_type="FULL_SHARING",
                    purpose="TREATMENT",
                    status="ACTIVE",
                    notes="Patient consented to multi-hospital record consolidation."
                ))
                db.commit()

        # 9. Seed Connected OPD Encounters & Queue Tokens
        enc1 = db.query(OpdEncounter).filter(OpdEncounter.token_number == "OPD-101").first()
        if not enc1 and ananya_patient and dr_mehta:
            enc1 = OpdEncounter(
                master_patient_id=ananya_patient.id,
                doctor_id=dr_mehta.id,
                organization_id=org_a.id,
                token_number="OPD-101",
                department="Cardiology & Internal Medicine",
                visit_type="APPOINTMENT",
                status="WITH_DOCTOR",
                arrival_time=datetime(2026, 10, 13, 9, 30),
                consultation_start_time=datetime(2026, 10, 13, 9, 45),
                vitals_bp="128/82 mmHg",
                vitals_pulse="74 bpm",
                vitals_temp="98.4 F",
                vitals_spo2="99%",
                chief_complaint="Post-stent coronary evaluation, mild exertional dyspnea",
                clinical_notes="Cardiac auscultation normal S1/S2 without murmurs. Blood pressure well controlled."
            )
            db.add(enc1)
            db.commit()

        enc2 = db.query(OpdEncounter).filter(OpdEncounter.token_number == "OPD-102").first()
        if not enc2 and neha_sharma and dr_gupta:
            enc2 = OpdEncounter(
                master_patient_id=neha_sharma.id,
                doctor_id=dr_gupta.id,
                organization_id=org_a.id,
                token_number="OPD-102",
                department="General Medicine",
                visit_type="WALK_IN",
                status="WAITING",
                arrival_time=datetime(2026, 10, 13, 10, 0),
                vitals_bp="118/76 mmHg",
                vitals_pulse="72 bpm",
                vitals_temp="98.6 F",
                vitals_spo2="98%",
                chief_complaint="Seasonal allergic cough and mild fatigue"
            )
            db.add(enc2)
            db.commit()

        enc3 = db.query(OpdEncounter).filter(OpdEncounter.token_number == "OPD-103").first()
        if not enc3 and neha_patel:
            enc3 = OpdEncounter(
                master_patient_id=neha_patel.id,
                doctor_id=None,
                organization_id=org_a.id,
                token_number="OPD-103",
                department="Orthopaedics",
                visit_type="WALK_IN",
                status="REGISTERED",
                arrival_time=datetime(2026, 10, 13, 10, 15),
                vitals_bp="122/80 mmHg",
                vitals_pulse="78 bpm",
                vitals_temp="98.2 F",
                vitals_spo2="99%",
                chief_complaint="Right knee pain after light exercise"
            )
            db.add(enc3)
            db.commit()

        # 10. Seed Lab Orders across lifecycle
        lab1 = db.query(LabOrder).filter(LabOrder.order_number == "LAB-2026-101").first()
        if not lab1 and ananya_patient and dr_mehta and enc1:
            lab1_results = [
                {"parameter": "White Blood Cells (WBC)", "result_value": "7.4", "unit": "10^3/uL", "reference_range": "4.0 - 11.0", "flag": "NORMAL"},
                {"parameter": "Red Blood Cells (RBC)", "result_value": "4.7", "unit": "10^6/uL", "reference_range": "4.2 - 5.4", "flag": "NORMAL"},
                {"parameter": "Hemoglobin (Hb)", "result_value": "13.8", "unit": "g/dL", "reference_range": "12.0 - 16.0", "flag": "NORMAL"},
                {"parameter": "Platelets", "result_value": "245", "unit": "10^3/uL", "reference_range": "150 - 450", "flag": "NORMAL"}
            ]
            lab_tech_user = db.query(User).filter(User.username == "lab_tech").first()
            lab1 = LabOrder(
                order_number="LAB-2026-101",
                master_patient_id=ananya_patient.id,
                encounter_id=enc1.id,
                ordering_doctor_id=dr_mehta.id,
                test_name="Complete Blood Count (CBC)",
                priority="ROUTINE",
                laboratory_name="Central Diagnostic Pathology Lab",
                status="PUBLISHED",
                sample_type="Venous Blood (EDTA)",
                sample_collected_at=datetime(2026, 10, 13, 9, 50),
                results_json=json.dumps(lab1_results),
                verified_by_user_id=lab_tech_user.id if lab_tech_user else None,
                verified_at=datetime(2026, 10, 13, 10, 20),
                clinical_notes="Complete hematological profile within normal limits."
            )
            db.add(lab1)
            db.commit()

        lab2 = db.query(LabOrder).filter(LabOrder.order_number == "LAB-2026-102").first()
        if not lab2 and neha_sharma and dr_gupta and enc2:
            lab_tech_user = db.query(User).filter(User.username == "lab_tech").first()
            lab2 = LabOrder(
                order_number="LAB-2026-102",
                master_patient_id=neha_sharma.id,
                encounter_id=enc2.id,
                ordering_doctor_id=dr_gupta.id,
                test_name="Lipid Profile (Fasting)",
                priority="ROUTINE",
                laboratory_name="Central Diagnostic Pathology Lab",
                status="SAMPLE_COLLECTED",
                sample_type="Serum Gel Separator",
                sample_collected_at=datetime(2026, 10, 13, 10, 10),
                collected_by_user_id=lab_tech_user.id if lab_tech_user else None,
                clinical_notes="Sample drawn fasting (10 hours)."
            )
            db.add(lab2)
            db.commit()

        lab3 = db.query(LabOrder).filter(LabOrder.order_number == "LAB-2026-103").first()
        if not lab3 and ananya_patient and dr_mehta and enc1:
            lab3 = LabOrder(
                order_number="LAB-2026-103",
                master_patient_id=ananya_patient.id,
                encounter_id=enc1.id,
                ordering_doctor_id=dr_mehta.id,
                test_name="Serum Creatinine & eGFR",
                priority="URGENT",
                laboratory_name="Central Diagnostic Pathology Lab",
                status="ORDERED",
                sample_type="Venous Blood",
                clinical_notes="Check renal profile before dose titration."
            )
            db.add(lab3)
            db.commit()

        # 11. Seed Prescriptions & Dispensing Records
        rx1 = db.query(PrescriptionOrder).filter(PrescriptionOrder.prescription_number == "RX-2026-101").first()
        if not rx1 and ananya_patient and dr_mehta and enc1:
            pharm_user = db.query(User).filter(User.username == "pharmacist").first()
            rx1 = PrescriptionOrder(
                prescription_number="RX-2026-101",
                master_patient_id=ananya_patient.id,
                encounter_id=enc1.id,
                doctor_id=dr_mehta.id,
                medication_name="Metformin Hydrochloride",
                strength="500 mg",
                dosage="1 Tablet",
                route="ORAL",
                frequency="Twice daily after meals",
                duration="30 Days",
                quantity_prescribed=60,
                quantity_dispensed=60,
                status="DISPENSED",
                instructions="Take with breakfast and dinner. Do not skip meals."
            )
            db.add(rx1)
            db.flush()

            if pharm_user:
                disp1 = DispensingRecord(
                    prescription_id=rx1.id,
                    pharmacist_user_id=pharm_user.id,
                    dispensed_quantity=60,
                    batch_number="B-2026-M49",
                    counseling_notes="Patient instructed on GI tolerability."
                )
                db.add(disp1)
            db.commit()

        rx2 = db.query(PrescriptionOrder).filter(PrescriptionOrder.prescription_number == "RX-2026-102").first()
        if not rx2 and ananya_patient and dr_mehta and enc1:
            rx2 = PrescriptionOrder(
                prescription_number="RX-2026-102",
                master_patient_id=ananya_patient.id,
                encounter_id=enc1.id,
                doctor_id=dr_mehta.id,
                medication_name="Atorvastatin Calcium",
                strength="20 mg",
                dosage="1 Tablet",
                route="ORAL",
                frequency="Once daily at bedtime",
                duration="30 Days",
                quantity_prescribed=30,
                quantity_dispensed=0,
                status="ISSUED",
                instructions="Take at bedtime. Report any unexplained muscle soreness."
            )
            db.add(rx2)
            db.commit()

        rx3 = db.query(PrescriptionOrder).filter(PrescriptionOrder.prescription_number == "RX-2026-103").first()
        if not rx3 and neha_sharma and dr_gupta and enc2:
            pharm_user = db.query(User).filter(User.username == "pharmacist").first()
            rx3 = PrescriptionOrder(
                prescription_number="RX-2026-103",
                master_patient_id=neha_sharma.id,
                encounter_id=enc2.id,
                doctor_id=dr_gupta.id,
                medication_name="Amoxicillin-Clavulanate",
                strength="625 mg",
                dosage="1 Tablet",
                route="ORAL",
                frequency="Twice daily after food",
                duration="7 Days",
                quantity_prescribed=14,
                quantity_dispensed=14,
                status="DISPENSED",
                instructions="Complete full 7-day course."
            )
            db.add(rx3)
            db.flush()
            if pharm_user:
                db.add(DispensingRecord(
                    prescription_id=rx3.id,
                    pharmacist_user_id=pharm_user.id,
                    dispensed_quantity=14,
                    batch_number="B-2026-AUG1",
                    counseling_notes="Complete entire course."
                ))
            db.commit()

        # 12. Seed Bills, Bill Items, and Payments (with Verified Paid checks and Receipts!)
        bill1 = db.query(Bill).filter(Bill.bill_number == "INV-OPD-101").first()
        cashier_user = db.query(User).filter(User.username == "cashier").first()
        if not bill1 and ananya_patient and enc1:
            bill1 = Bill(
                bill_number="INV-OPD-101",
                master_patient_id=ananya_patient.id,
                encounter_id=enc1.id,
                bill_type="OPD_CONSULTATION",
                total_amount=500.0,
                discount_amount=0.0,
                tax_amount=0.0,
                net_payable=500.0,
                amount_paid=500.0,
                balance_due=0.0,
                status="PAID",
                notes="Cardiology Specialist Consultation Consultation Fee",
                created_by_user_id=cashier_user.id if cashier_user else None
            )
            db.add(bill1)
            db.flush()

            db.add(BillItem(
                bill_id=bill1.id,
                item_description="Specialist Consultation - Cardiology & Internal Medicine",
                unit_price=500.0,
                quantity=1,
                total_price=500.0
            ))

            db.add(PaymentTransaction(
                transaction_ref="TXN-SB-2026-00101",
                bill_id=bill1.id,
                amount=500.0,
                payment_method="UPI",
                payment_status="SUCCESS",
                receipt_number="REC-2026-101",
                processed_by_user_id=cashier_user.id if cashier_user else None,
                is_verified=True,
                notes="Instant UPI settlement confirmed"
            ))
            db.commit()

        bill2 = db.query(Bill).filter(Bill.bill_number == "INV-LAB-101").first()
        if not bill2 and ananya_patient:
            bill2 = Bill(
                bill_number="INV-LAB-101",
                master_patient_id=ananya_patient.id,
                encounter_id=enc1.id if enc1 else None,
                bill_type="LABORATORY",
                total_amount=350.0,
                discount_amount=0.0,
                tax_amount=0.0,
                net_payable=350.0,
                amount_paid=350.0,
                balance_due=0.0,
                status="PAID",
                notes="Complete Blood Count Laboratory Investigation",
                created_by_user_id=cashier_user.id if cashier_user else None
            )
            db.add(bill2)
            db.flush()
            db.add(BillItem(
                bill_id=bill2.id,
                item_description="Laboratory Test: Complete Blood Count (CBC)",
                unit_price=350.0,
                quantity=1,
                total_price=350.0
            ))
            db.add(PaymentTransaction(
                transaction_ref="TXN-SB-2026-00102",
                bill_id=bill2.id,
                amount=350.0,
                payment_method="SANDBOX_GATEWAY",
                payment_status="SUCCESS",
                receipt_number="REC-2026-102",
                processed_by_user_id=cashier_user.id if cashier_user else None,
                is_verified=True,
                notes="Sandbox Gateway Verified Transaction"
            ))
            db.commit()

        bill3 = db.query(Bill).filter(Bill.bill_number == "INV-PHARM-101").first()
        if not bill3 and ananya_patient:
            bill3 = Bill(
                bill_number="INV-PHARM-101",
                master_patient_id=ananya_patient.id,
                encounter_id=enc1.id if enc1 else None,
                bill_type="PHARMACY",
                total_amount=750.0,
                discount_amount=0.0,
                tax_amount=0.0,
                net_payable=750.0,
                amount_paid=0.0,
                balance_due=750.0,
                status="PENDING",
                notes="Atorvastatin & Metformin Pharmacy Charges",
                created_by_user_id=cashier_user.id if cashier_user else None
            )
            db.add(bill3)
            db.flush()
            db.add(BillItem(
                bill_id=bill3.id,
                item_description="Metformin Hydrochloride 500mg (60 tabs)",
                unit_price=375.0,
                quantity=1,
                total_price=375.0
            ))
            db.add(BillItem(
                bill_id=bill3.id,
                item_description="Atorvastatin Calcium 20mg (30 tabs)",
                unit_price=375.0,
                quantity=1,
                total_price=375.0
            ))
            db.commit()

        bill4 = db.query(Bill).filter(Bill.bill_number == "INV-OPD-102").first()
        if not bill4 and neha_sharma and enc2:
            bill4 = Bill(
                bill_number="INV-OPD-102",
                master_patient_id=neha_sharma.id,
                encounter_id=enc2.id,
                bill_type="OPD_CONSULTATION",
                total_amount=400.0,
                discount_amount=0.0,
                tax_amount=0.0,
                net_payable=400.0,
                amount_paid=400.0,
                balance_due=0.0,
                status="PAID",
                notes="General Medicine OPD Consultation",
                created_by_user_id=cashier_user.id if cashier_user else None
            )
            db.add(bill4)
            db.flush()
            db.add(BillItem(
                bill_id=bill4.id,
                item_description="General Medicine OPD Consultation",
                unit_price=400.0,
                quantity=1,
                total_price=400.0
            ))
            db.add(PaymentTransaction(
                transaction_ref="TXN-CASH-2026-00103",
                bill_id=bill4.id,
                amount=400.0,
                payment_method="CASH",
                payment_status="SUCCESS",
                receipt_number="REC-2026-103",
                processed_by_user_id=cashier_user.id if cashier_user else None,
                is_verified=True,
                notes="Audited Cash Desk Payment"
            ))
            db.commit()

        # 13. Seed In-App Notifications
        if ananya_patient and ananya_patient.linked_user_id:
            notifs = [
                Notification(
                    user_id=ananya_patient.linked_user_id,
                    title="Welcome to Unified Patient Portal",
                    message="Your multi-hospital health records from Metro General and St. Jude are aggregated and secured.",
                    category="SECURITY",
                    is_read=True
                ),
                Notification(
                    user_id=ananya_patient.linked_user_id,
                    title="OPD Token #OPD-101 Generated",
                    message="Your token #OPD-101 has been registered for Cardiology with Dr. Arvind Mehta.",
                    category="APPOINTMENT",
                    is_read=True
                ),
                Notification(
                    user_id=ananya_patient.linked_user_id,
                    title="Diagnostic Report Verified",
                    message="Your Complete Blood Count (CBC) laboratory report has been verified by Chief Pathologist.",
                    category="LAB_REPORT",
                    is_read=False
                ),
                Notification(
                    user_id=ananya_patient.linked_user_id,
                    title="Payment Confirmed",
                    message="Receipt #REC-2026-101 issued for ₹500.00 (OPD Consultation).",
                    category="BILLING",
                    is_read=False
                )
            ]
            for n in notifs:
                exists = db.query(Notification).filter(
                    Notification.user_id == n.user_id,
                    Notification.title == n.title
                ).first()
                if not exists:
                    db.add(n)
            db.commit()

        if neha_sharma and neha_sharma.linked_user_id:
            notifs_neha = [
                Notification(
                    user_id=neha_sharma.linked_user_id,
                    title="OPD Token #OPD-102 Generated",
                    message="Your token #OPD-102 has been registered for General Medicine with Dr. Rajesh Gupta.",
                    category="APPOINTMENT",
                    is_read=False
                ),
                Notification(
                    user_id=neha_sharma.linked_user_id,
                    title="Prescription Dispensed",
                    message="Amoxicillin-Clavulanate 625mg has been dispensed by Lead Pharmacist Sunita Rao.",
                    category="PRESCRIPTION",
                    is_read=False
                )
            ]
            for n in notifs_neha:
                exists = db.query(Notification).filter(
                    Notification.user_id == n.user_id,
                    Notification.title == n.title
                ).first()
                if not exists:
                    db.add(n)
            db.commit()

        # 14. Seed Radiology Studies for Ananya Sharma
        if ananya_patient and org_a and org_b:
            existing_rad_count = db.query(ClinicalRadiology).filter(
                ClinicalRadiology.master_patient_id == ananya_patient.id
            ).count()
            if existing_rad_count == 0:
                radiology_studies = [
                    ClinicalRadiology(
                        master_patient_id=ananya_patient.id,
                        organization_id=org_a.id,
                        study_type="Chest Radiograph (PA & Lateral)",
                        modality="CR",
                        body_region="Thorax / Chest",
                        study_date=datetime(2026, 8, 14, 10, 15),
                        status="FINAL",
                        summary="Frontal and lateral radiographs of the chest demonstrate clear lung parenchyma without focal consolidation, pneumothorax, or pleural effusion. Cardiothoracic ratio is normal (0.46). Bony thorax and soft tissues unremarkable.",
                        impression="Normal posteroanterior chest radiograph. No acute cardiopulmonary disease.",
                        radiologist_name="Dr. Karen Mitchell, MD (Radiology)",
                        image_url="/radiology/chest_xray.jpg",
                        dicom_series_uid="1.2.840.113619.2.55.3.2819281.20260814.1"
                    ),
                    ClinicalRadiology(
                        master_patient_id=ananya_patient.id,
                        organization_id=org_b.id,
                        study_type="Brain MRI (Axial T1/T2/FLAIR)",
                        modality="MR",
                        body_region="Brain / Neurological",
                        study_date=datetime(2026, 7, 20, 14, 30),
                        status="FINAL",
                        summary="Multi-sequence magnetic resonance imaging of the brain without IV contrast. Symmetric cerebral hemispheres with normal gray-white differentiation. No acute territorial infarction, intracranial hemorrhage, or mass effect. Ventricles and sulci are within normal limits for age.",
                        impression="Normal brain MRI. No evidence of acute ischemia, hemorrhage, or demyelinating process.",
                        radiologist_name="Dr. David Zhao, MD (Neuroradiology)",
                        image_url="/radiology/brain_mri.jpg",
                        dicom_series_uid="1.2.840.113619.2.55.3.4910283.20260720.2"
                    )
                ]
                for r in radiology_studies:
                    db.add(r)
                db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    print("Database successfully seeded with realistic multi-hospital records!")
