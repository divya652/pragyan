from datetime import date
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.consent import PatientConsent
from app.models.organization import HealthcareOrganization

def evaluate_patient_sharing_consent(
    db: Session,
    master_patient_id: int,
    is_emergency: bool = False
) -> Tuple[bool, List[int], str]:
    """
    Evaluates patient consent policies.
    Returns:
        (is_access_permitted: bool, authorized_org_ids: List[int], consent_summary: str)
    """
    all_orgs = db.query(HealthcareOrganization).filter(HealthcareOrganization.is_active == True).all()
    all_org_ids = [org.id for org in all_orgs]

    consents = db.query(PatientConsent).filter(
        PatientConsent.master_patient_id == master_patient_id,
        PatientConsent.status == "ACTIVE"
    ).all()

    # If no explicit consent record exists, default to standard treatment sharing
    if not consents:
        return True, all_org_ids, "DEFAULT_TREATMENT_CONSENT"

    # Check for REVOKED or EMERGENCY_ONLY
    for c in consents:
        # Check validity date window if specified
        today = date.today()
        if c.valid_until and c.valid_until < today:
            continue

        if c.consent_type == "REVOKED" and not is_emergency:
            return False, [], "CONSENT_REVOKED_BY_PATIENT"

        if c.consent_type == "EMERGENCY_ONLY" and not is_emergency:
            return False, [], "RESTRICTED_TO_EMERGENCY_ONLY"

    # Check for specific restricted sources
    excluded_org_ids = set()
    for c in consents:
        if c.consent_type == "RESTRICTED_SOURCE" and c.organization_id:
            excluded_org_ids.add(c.organization_id)

    authorized_org_ids = [oid for oid in all_org_ids if oid not in excluded_org_ids]
    return True, authorized_org_ids, "ACTIVE_CONSENT_GRANTED"
