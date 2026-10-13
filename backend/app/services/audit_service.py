import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_audit_event(
    db: Session,
    actor_user_id: Optional[int] = None,
    actor_role: str = "system",
    action: str = "ACTION",
    resource_type: str = "GENERAL",
    resource_id: Optional[str] = None,
    outcome: str = "SUCCESS",
    ip_address: Optional[str] = "127.0.0.1",
    details: Optional[Any] = None,
    **kwargs
):
    """
    Indelible, immutable audit log recorder.
    Ensures that security events, PHI chart views, modifications, and denials
    are preserved for compliance and operational transparency.
    """
    # Accommodate flexible keyword aliases
    if "actor_id" in kwargs and actor_user_id is None:
        actor_user_id = kwargs["actor_id"]
    if "target_resource" in kwargs and resource_type == "GENERAL":
        resource_type = kwargs["target_resource"]
    if "patient_id" in kwargs and resource_id is None:
        resource_id = str(kwargs["patient_id"])

    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details, default=str)
        else:
            details_str = str(details)

    audit_entry = AuditLog(
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome=outcome,
        ip_address=ip_address,
        details_json=details_str
    )
    db.add(audit_entry)
    db.commit()
    return audit_entry
