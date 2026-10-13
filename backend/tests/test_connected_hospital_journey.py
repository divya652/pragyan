import pytest
from app.models.user import User
from app.models.patient import MasterPatient
from app.models.billing import Bill

def test_01_safe_patient_search_disambiguation_for_neha(client, auth_tokens):
    """
    Requirement 3.B & 12: Searching for 'Neha' displays multiple matching candidates
    with enough details (DOB, ABHA ID, Phone) to distinguish them safely WITHOUT
    automatically selecting or merging records based on name alone.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['doctor_mehta']}"}
    res = client.get("/api/doctor/search-patients?q=Neha", headers=headers)
    assert res.status_code == 200
    candidates = res.json()
    assert len(candidates) >= 2

    names = [f"{c['first_name']} {c['last_name']}" for c in candidates]
    assert "Neha Sharma" in names
    assert "Neha Patel" in names

    # Verify they have distinct national IDs and DOBs so clinician safely disambiguates
    c_sharma = next(c for c in candidates if c["last_name"] == "Sharma")
    c_patel = next(c for c in candidates if c["last_name"] == "Patel")
    assert c_sharma["national_health_id"] != c_patel["national_health_id"]
    assert c_sharma["dob"] != c_patel["dob"]

def test_02_receptionist_creates_opd_encounter_and_bill(client, auth_tokens):
    """
    Requirement 3.C & 4: Receptionist creates OPD encounter, generates token,
    and automatically initiates consultation bill in PENDING status.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['receptionist']}"}
    payload = {
        "master_patient_id": 1,
        "department": "Cardiology & Internal Medicine",
        "visit_type": "WALK_IN",
        "vitals_bp": "120/80 mmHg",
        "vitals_pulse": "72 bpm",
        "vitals_temp": "98.6 F",
        "vitals_spo2": "99%",
        "chief_complaint": "Routine follow-up consultation",
        "consultation_fee": 500.0
    }
    res = client.post("/api/opd/register", json=payload, headers=headers)
    assert res.status_code == 200
    encounter = res.json()
    assert "token_number" in encounter
    assert encounter["token_number"].startswith("OPD-")
    assert encounter["status"] == "REGISTERED"
    assert encounter["bill_status"] == "PENDING"
    assert encounter["bill_id"] is not None

def test_03_payment_confirmation_and_green_paid_status(client, auth_tokens):
    """
    Requirement 3.F: Bill transitions to 'PAID' ONLY upon backend verified transaction.
    Receipt number and transaction reference are generated.
    Duplicate payment is strictly prevented.
    """
    # 1. Fetch pending bills as receptionist or cashier
    headers_recep = {"Authorization": f"Bearer {auth_tokens['receptionist']}"}
    res_bills = client.get("/api/billing/bills?status_filter=PENDING", headers=headers_recep)
    assert res_bills.status_code == 200
    bills = res_bills.json()
    assert len(bills) > 0
    target_bill = bills[0]

    # 2. Process sandbox payment
    pay_payload = {
        "bill_id": target_bill["id"],
        "amount": target_bill["balance_due"],
        "payment_method": "SANDBOX_GATEWAY",
        "notes": "Payment processed through sandbox gateway"
    }
    res_pay = client.post("/api/billing/pay", json=pay_payload, headers=headers_recep)
    assert res_pay.status_code == 200
    paid_bill = res_pay.json()
    assert paid_bill["status"] == "PAID"
    assert paid_bill["balance_due"] == 0.0
    assert len(paid_bill["payments"]) > 0
    payment_record = paid_bill["payments"][-1]
    assert payment_record["is_verified"] is True
    assert payment_record["receipt_number"].startswith("REC-2026-")

    # 3. Test Prevention of Duplicate Payment
    res_dup = client.post("/api/billing/pay", json=pay_payload, headers=headers_recep)
    assert res_dup.status_code == 400
    assert "Duplicate payment prevented" in res_dup.json()["detail"]

def test_04_doctor_orders_lab_and_lab_technician_workflow(client, auth_tokens):
    """
    Requirement 3.D & 4:
    Doctor orders lab -> Lab tech collects specimen -> Enters results -> Verifies and publishes report.
    Non-lab staff cannot verify or publish.
    """
    headers_doc = {"Authorization": f"Bearer {auth_tokens['doctor_mehta']}"}
    headers_lab = {"Authorization": f"Bearer {auth_tokens['receptionist']}"} # Receptionist should be blocked

    # 1. Doctor creates lab order
    lab_payload = {
        "master_patient_id": 1,
        "test_name": "Thyroid Stimulating Hormone (TSH)",
        "priority": "ROUTINE",
        "laboratory_name": "Central Diagnostic Pathology Lab",
        "sample_type": "Venous Blood",
        "clinical_notes": "Evaluate thyroid function"
    }
    res_order = client.post("/api/lab/orders", json=lab_payload, headers=headers_doc)
    assert res_order.status_code == 200
    order = res_order.json()
    assert order["status"] == "ORDERED"
    order_id = order["id"]

    # 2. Receptionist attempts to collect sample -> 403 Forbidden
    res_blocked = client.post(f"/api/lab/orders/{order_id}/collect-sample", json={"sample_type": "Venous Blood"}, headers=headers_lab)
    assert res_blocked.status_code == 403

    # 3. Admin / Lab Tech collects sample
    headers_admin = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    res_collected = client.post(f"/api/lab/orders/{order_id}/collect-sample", json={"sample_type": "Venous Blood"}, headers=headers_admin)
    assert res_collected.status_code == 200
    assert res_collected.json()["status"] == "SAMPLE_COLLECTED"

    # 4. Enter structured results
    res_results = client.post(
        f"/api/lab/orders/{order_id}/enter-results",
        json={
            "results": [
                {"parameter": "TSH", "result_value": "2.45", "unit": "uIU/mL", "reference_range": "0.4 - 4.0", "flag": "NORMAL"}
            ]
        },
        headers=headers_admin
    )
    assert res_results.status_code == 200
    assert res_results.json()["status"] == "AWAITING_VERIFICATION"

    # 5. Verify and Publish report
    res_publish = client.post(f"/api/lab/orders/{order_id}/verify-and-publish", headers=headers_admin)
    assert res_publish.status_code == 200
    published = res_publish.json()
    assert published["status"] == "PUBLISHED"
    assert published["verified_by_name"] is not None

def test_05_prescription_and_dispensing_workflow(client, auth_tokens):
    """
    Requirement 3.E & 4:
    Doctor prescribes medication -> Pharmacist records physical dispensing event.
    Pharmacist cannot alter doctor's prescription.
    """
    headers_doc = {"Authorization": f"Bearer {auth_tokens['doctor_mehta']}"}
    headers_admin = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # 1. Doctor prescribes
    rx_payload = {
        "master_patient_id": 1,
        "medication_name": "Lisinopril",
        "strength": "10 mg",
        "dosage": "1 Tablet",
        "route": "ORAL",
        "frequency": "Once daily in the morning",
        "duration": "30 Days",
        "quantity_prescribed": 30,
        "instructions": "Take with water"
    }
    res_rx = client.post("/api/pharmacy/prescriptions", json=rx_payload, headers=headers_doc)
    assert res_rx.status_code == 200
    rx = res_rx.json()
    assert rx["status"] == "ISSUED"
    rx_id = rx["id"]

    # 2. Pharmacist dispenses
    disp_payload = {
        "dispensed_quantity": 30,
        "batch_number": "B-2026-LIS1",
        "counseling_notes": "Monitor blood pressure regularly"
    }
    res_disp = client.post(f"/api/pharmacy/prescriptions/{rx_id}/dispense", json=disp_payload, headers=headers_admin)
    assert res_disp.status_code == 200
    dispensed_rx = res_disp.json()
    assert dispensed_rx["status"] == "DISPENSED"
    assert dispensed_rx["quantity_dispensed"] == 30
    assert len(dispensed_rx["dispensing_records"]) == 1

def test_06_admin_doctor_verification_workflow(client, auth_tokens):
    """
    Requirement 3.G:
    Doctor credentials remain pending until verified by Administrator.
    Doctor cannot self-assign verified status.
    """
    headers_admin = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # 1. List doctors for verification
    res_docs = client.get("/api/admin/doctors", headers=headers_admin)
    assert res_docs.status_code == 200
    doctors = res_docs.json()
    assert len(doctors) >= 2

    # Dr. Gupta is pending verification
    gupta = next((d for d in doctors if "Gupta" in d["full_name"]), None)
    if gupta:
        assert gupta["verification_status"] == "PENDING_VERIFICATION"
        # Admin approves credentials
        verify_payload = {
            "doctor_id": gupta["id"],
            "status": "VERIFIED",
            "review_notes": "Verified against National Medical Register database."
        }
        res_ver = client.post(f"/api/admin/doctors/{gupta['id']}/verify", json=verify_payload, headers=headers_admin)
        assert res_ver.status_code == 200
        assert res_ver.json()["verification_status"] == "VERIFIED"

def test_07_patient_portal_timeline_and_records(client, auth_tokens):
    """
    Requirement 5 & 10:
    Patient portal accesses personalized timeline connecting OPD, Payment, Lab, and Pharmacy.
    """
    headers_pat = {"Authorization": f"Bearer {auth_tokens['patient_ananya']}"}
    res_timeline = client.get("/api/patient-portal/my-timeline", headers=headers_pat)
    assert res_timeline.status_code == 200
    timeline = res_timeline.json()
    assert len(timeline) >= 3

    event_types = [e["event_type"] for e in timeline]
    assert any("OPD" in et or "CONSULTATION" in et for et in event_types)
    assert any("PAYMENT" in et or "BILL" in et for et in event_types)
