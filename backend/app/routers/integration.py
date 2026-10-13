import json
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.organization import HealthcareOrganization
from app.models.patient import MasterPatient, SourcePatientRecord, IdentityMatchCandidate
from app.models.integration import IntegrationJob
from app.schemas.matching import MatchCandidateResponse, MatchActionRequest
from app.schemas.integration import IntegrationJobResponse, ImportDataRequest
from app.security import require_roles
from app.services.normalizer_service import (
    normalize_and_import_hospital_a_fhir,
    normalize_and_import_hospital_b_legacy
)
from app.services.conflict_engine import detect_and_record_conflicts
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/integration", tags=["Multi-Hospital Interoperability"])

@router.get("/match-candidates", response_model=List[MatchCandidateResponse])
def get_pending_match_candidates(
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Lists uncertain patient identity matches flagged for human HIM/admin review.
    Enforces that ambiguous records are NEVER merged automatically.
    """
    candidates = db.query(IdentityMatchCandidate).filter(
        IdentityMatchCandidate.status == "PENDING"
    ).all()

    result = []
    for c in candidates:
        source_rec = c.source_record
        cand_patient = c.candidate_master_patient
        if not source_rec or not cand_patient:
            continue

        raw_demo = {}
        try:
            raw_demo = json.loads(source_rec.raw_demographics_json)
        except Exception:
            pass

        criteria = {}
        try:
            criteria = json.loads(c.match_criteria_json)
        except Exception:
            pass

        result.append({
            "id": c.id,
            "source_record_id": c.source_record_id,
            "source_organization_code": source_rec.organization.code if source_rec.organization else "UNKNOWN",
            "source_organization_name": source_rec.organization.name if source_rec.organization else "Unknown Facility",
            "source_patient_id": source_rec.source_system_patient_id,
            "source_demographics": raw_demo,
            "candidate_master_patient_id": cand_patient.id,
            "candidate_national_health_id": cand_patient.national_health_id,
            "candidate_name": f"{cand_patient.first_name} {cand_patient.last_name}",
            "candidate_dob": str(cand_patient.dob),
            "candidate_gender": cand_patient.gender,
            "candidate_phone": cand_patient.phone,
            "match_score": c.match_score,
            "match_criteria": criteria,
            "status": c.status,
            "created_at": c.created_at
        })
    return result

@router.post("/match-candidates/{candidate_id}/action")
def take_match_action(
    candidate_id: int,
    action_in: MatchActionRequest,
    request: Request,
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Authorized human review of uncertain identity match candidate.
    Admin can APPROVE_LINK (safe merge with audit justification) or REJECT_LINK (keeps separate).
    """
    candidate = db.query(IdentityMatchCandidate).filter(IdentityMatchCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate match record not found.")

    source_record = candidate.source_record
    client_ip = request.client.host if request.client else "unknown"

    if action_in.action == "APPROVE_LINK":
        candidate.status = "APPROVED"
        candidate.reviewed_by_user_id = user.id
        candidate.reviewed_at = datetime.utcnow()
        candidate.review_notes = action_in.review_notes

        source_record.master_patient_id = candidate.candidate_master_patient_id
        source_record.match_status = "MATCHED"
        db.commit()

        # Run conflict detection for this newly unified patient
        detect_and_record_conflicts(db, master_patient_id=candidate.candidate_master_patient_id)

        log_audit_event(
            db=db,
            actor_user_id=user.id,
            actor_role=user.role,
            action="APPROVE_PATIENT_IDENTITY_LINK",
            resource_type="MATCH_CANDIDATE",
            resource_id=str(candidate_id),
            outcome="SUCCESS",
            ip_address=client_ip,
            details={"master_patient_id": candidate.candidate_master_patient_id, "notes": action_in.review_notes}
        )
        return {"message": "Identity match approved and patient records consolidated.", "status": "APPROVED"}

    elif action_in.action == "REJECT_LINK":
        candidate.status = "REJECTED"
        candidate.reviewed_by_user_id = user.id
        candidate.reviewed_at = datetime.utcnow()
        candidate.review_notes = action_in.review_notes

        source_record.match_status = "UNLINKED"
        db.commit()

        log_audit_event(
            db=db,
            actor_user_id=user.id,
            actor_role=user.role,
            action="REJECT_PATIENT_IDENTITY_LINK",
            resource_type="MATCH_CANDIDATE",
            resource_id=str(candidate_id),
            outcome="SUCCESS",
            ip_address=client_ip,
            details={"notes": action_in.review_notes}
        )
        return {"message": "Identity match rejected. Record preserved as distinct entity.", "status": "REJECTED"}

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'APPROVE_LINK' or 'REJECT_LINK'.")

@router.get("/jobs", response_model=List[IntegrationJobResponse])
def get_integration_jobs(
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Lists integration ingestion history, processed records, and error counts."""
    jobs = db.query(IntegrationJob).order_by(IntegrationJob.created_at.desc()).limit(50).all()
    result = []
    for j in jobs:
        result.append({
            "id": j.id,
            "organization_id": j.organization_id,
            "organization_code": j.organization.code if j.organization else "N/A",
            "organization_name": j.organization.name if j.organization else "N/A",
            "job_type": j.job_type,
            "records_processed": j.records_processed,
            "records_matched": j.records_matched,
            "conflicts_detected": j.conflicts_detected,
            "errors_count": j.errors_count,
            "status": j.status,
            "error_details": j.error_details_json,
            "created_at": j.created_at
        })
    return result

@router.post("/import/{org_code}")
def import_simulated_hospital_data(
    org_code: str,
    import_in: ImportDataRequest,
    request: Request,
    user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Ingests data payload for simulated Hospital A (FHIR JSON) or Hospital B (Legacy EHR JSON).
    """
    org = db.query(HealthcareOrganization).filter(HealthcareOrganization.code == org_code.upper()).first()
    if not org:
        raise HTTPException(status_code=404, detail=f"Healthcare Organization '{org_code}' not found.")

    client_ip = request.client.host if request.client else "unknown"
    payload = import_in.payload

    try:
        if org.code == "HOSP_A":
            # Expecting FHIR bundle or list of bundles
            processed, matched, conflicts = normalize_and_import_hospital_a_fhir(db, org, payload)
            job_type = "FHIR_R4_IMPORT"
        elif org.code == "HOSP_B":
            # Expecting Legacy JSON
            processed, matched, conflicts = normalize_and_import_hospital_b_legacy(db, org, payload)
            job_type = "LEGACY_EHR_IMPORT"
        else:
            raise HTTPException(status_code=400, detail="Unsupported organization integration type.")

        # Record integration job
        job = IntegrationJob(
            organization_id=org.id,
            job_type=job_type,
            records_processed=processed,
            records_matched=matched,
            conflicts_detected=conflicts,
            errors_count=0,
            status="COMPLETED"
        )
        db.add(job)
        db.commit()

        log_audit_event(
            db=db,
            actor_user_id=user.id,
            actor_role=user.role,
            action="TRIGGER_DATA_IMPORT",
            resource_type="INTEGRATION_JOB",
            resource_id=str(job.id),
            outcome="SUCCESS",
            ip_address=client_ip,
            details={"org_code": org.code, "processed": processed, "matched": matched}
        )

        return {
            "message": f"Successfully ingested {processed} records from {org.name}.",
            "job_id": job.id,
            "records_processed": processed,
            "records_matched": matched
        }

    except Exception as e:
        db.rollback()
        job = IntegrationJob(
            organization_id=org.id,
            job_type="DATA_IMPORT",
            records_processed=0,
            records_matched=0,
            conflicts_detected=0,
            errors_count=1,
            status="FAILED",
            error_details_json=str(e)
        )
        db.add(job)
        db.commit()

        log_audit_event(
            db=db,
            actor_user_id=user.id,
            actor_role=user.role,
            action="TRIGGER_DATA_IMPORT",
            resource_type="INTEGRATION_JOB",
            resource_id=str(job.id),
            outcome="ERROR",
            ip_address=client_ip,
            details={"error": str(e)}
        )
        raise HTTPException(status_code=500, detail=f"Data ingestion failed: {str(e)}")
