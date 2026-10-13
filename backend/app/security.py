import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, Doctor, DoctorPatientAssignment
from app.models.patient import MasterPatient
from app.models.audit import AuditLog

bearer_scheme = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing subject.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or malformed authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact system administrator.",
        )

    return user

get_current_active_user = get_current_user

def require_roles(allowed_roles: List[str]):
    def role_checker(
        request: Request,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        if user.role not in allowed_roles:
            # Record unauthorized attempt in audit log
            audit = AuditLog(
                actor_user_id=user.id,
                actor_role=user.role,
                action="UNAUTHORIZED_ROLE_ACCESS",
                resource_type="API_ENDPOINT",
                resource_id=request.url.path,
                outcome="DENIED",
                ip_address=request.client.host if request.client else "unknown",
                details_json=f'{{"required_roles": {allowed_roles}, "user_role": "{user.role}", "path": "{request.url.path}"}}'
            )
            db.add(audit)
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Role '{user.role}' is not authorized for this operation. Permitted roles: {', '.join(allowed_roles)}.",
            )
        return user
    return role_checker

def verify_clinical_access(
    patient_id: int,
    user: User,
    db: Session,
    request: Request
) -> MasterPatient:
    """
    Enforces Strict Patient-Level Authorization:
    1. Receptionist is NEVER permitted clinical access (returns 403).
    2. Admin is NOT permitted clinical access unless assigned as a clinician (returns 403).
    3. Patient can ONLY access their own records (linked_user_id == user.id).
    4. Doctor can ONLY access patients where an active assignment or emergency override exists.
    """
    patient = db.query(MasterPatient).filter(MasterPatient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found.")

    client_ip = request.client.host if request.client else "unknown"

    # Receptionist prohibition
    if user.role == "receptionist":
        audit = AuditLog(
            actor_user_id=user.id,
            actor_role=user.role,
            action="CLINICAL_ACCESS_BLOCKED_RECEPTIONIST",
            resource_type="CLINICAL_RECORD",
            resource_id=str(patient_id),
            outcome="DENIED",
            ip_address=client_ip,
            details_json='{"reason": "Administrative role cannot access Protected Health Information"}'
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Receptionist personnel are restricted from viewing clinical health records."
        )

    # Administrator prohibition
    if user.role == "admin":
        audit = AuditLog(
            actor_user_id=user.id,
            actor_role=user.role,
            action="CLINICAL_ACCESS_BLOCKED_ADMIN",
            resource_type="CLINICAL_RECORD",
            resource_id=str(patient_id),
            outcome="DENIED",
            ip_address=client_ip,
            details_json='{"reason": "Administrators have system governance rights, not clinical chart access"}'
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: System administrators do not have automatic authorization to inspect clinical patient charts."
        )

    # Patient self-access validation
    if user.role == "patient":
        if patient.linked_user_id != user.id:
            audit = AuditLog(
                actor_user_id=user.id,
                actor_role=user.role,
                action="CROSS_PATIENT_ACCESS_ATTEMPT",
                resource_type="CLINICAL_RECORD",
                resource_id=str(patient_id),
                outcome="DENIED",
                ip_address=client_ip,
                details_json=f'{{"attempted_patient_id": {patient_id}, "user_patient_id": {patient.linked_user_id}}}'
            )
            db.add(audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You may only view your own medical records."
            )
        return patient

    # Doctor scope validation
    if user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No clinician profile associated with this account."
            )
        
        # Check active treatment assignment
        assignment = db.query(DoctorPatientAssignment).filter(
            DoctorPatientAssignment.doctor_id == doctor.id,
            DoctorPatientAssignment.patient_id == patient_id,
            DoctorPatientAssignment.active == True
        ).first()

        if not assignment:
            audit = AuditLog(
                actor_user_id=user.id,
                actor_role=user.role,
                action="UNAUTHORIZED_PATIENT_SCOPE_ATTEMPT",
                resource_type="CLINICAL_RECORD",
                resource_id=str(patient_id),
                outcome="DENIED",
                ip_address=client_ip,
                details_json=f'{{"doctor_id": {doctor.id}, "patient_id": {patient_id}, "reason": "No active treatment assignment"}}'
            )
            db.add(audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You are not an assigned treating clinician for this patient."
            )
        return patient

    # Any other unrecognized role
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied.")
