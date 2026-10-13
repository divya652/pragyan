from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, date
import re

from app.database import get_db
from app.models.user import User, Doctor
from app.models.patient import MasterPatient
from app.models.consent import PatientConsent
from app.schemas.auth import LoginRequest, Token, UserResponse, UserRegisterRequest
from app.security import verify_password, hash_password, create_access_token, get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(reg_req: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    """
    Public registration endpoint for Patients, Doctors, and Receptionists.
    Administrator accounts are strictly prohibited from public self-registration.
    """
    client_ip = request.client.host if request.client else "unknown"

    # 1. Role validation - Admin accounts cannot be self-registered
    role = reg_req.role.strip().lower()
    if role == "admin":
        log_audit_event(
            db=db,
            actor_user_id=None,
            actor_role="ANONYMOUS",
            action="UNAUTHORIZED_ADMIN_REGISTRATION_ATTEMPT",
            resource_type="AUTH",
            resource_id=reg_req.email,
            outcome="DENIED",
            ip_address=client_ip,
            details={"email": reg_req.email, "reason": "Admin self-registration prohibited"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Administrator accounts cannot be registered publicly. They must be provisioned by an existing system administrator."
        )

    if role not in ["patient", "doctor", "receptionist"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{role}'. Permitted roles are: patient, doctor, receptionist."
        )

    # 2. Full Name validation (accepts letters, Unicode, spaces, hyphens, apostrophes; rejects purely numeric/symbols)
    full_name = reg_req.full_name.strip()
    if len(full_name) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name must be at least 2 characters.")
    if re.match(r"^[\d\s\W]+$", full_name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name cannot consist exclusively of numbers or symbols.")

    # 3. Password validation
    if len(reg_req.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")

    # 4. Email normalization & Uniqueness
    norm_email = reg_req.email.strip().lower()
    existing_user_email = db.query(User).filter(User.email == norm_email).first()
    if existing_user_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email address already exists.")

    # 5. Username derivation or check
    username = reg_req.username.strip().lower() if reg_req.username else norm_email.split("@")[0]
    # Ensure username is unique
    existing_username = db.query(User).filter(User.username == username).first()
    if existing_username:
        username = f"{username}_{int(datetime.utcnow().timestamp())}"

    # 6. Parse Date of Birth if provided
    dob_date = None
    if reg_req.dob:
        try:
            dob_date = datetime.strptime(reg_req.dob.strip(), "%Y-%m-%d").date()
            if dob_date > date.today():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Date of birth cannot be in the future.")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Date of birth must be in YYYY-MM-DD format.")
    elif role == "patient":
        # Default reasonable date of birth for demo if not supplied
        dob_date = date(1995, 1, 1)

    # 7. Create User Account
    new_user = User(
        username=username,
        email=norm_email,
        full_name=full_name,
        hashed_password=hash_password(reg_req.password),
        role=role,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # 8. Role-specific profile initialization
    linked_patient_id = None
    doctor_id = None

    if role == "patient":
        # Check if patient already exists by national_health_id
        patient = None
        if reg_req.patient_id:
            patient = db.query(MasterPatient).filter(MasterPatient.national_health_id == reg_req.patient_id.strip()).first()
        
        if not patient:
            # Generate valid simulated National Health ID (e.g. ABHA-XXXX-XXXX-XXXX)
            nh_id = reg_req.patient_id.strip() if reg_req.patient_id else f"ABHA-{int(datetime.utcnow().timestamp())}"
            patient = MasterPatient(
                national_health_id=nh_id,
                first_name=full_name.split()[0],
                last_name=" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else "Patient",
                dob=dob_date or date(1995, 1, 1),
                gender=reg_req.gender or "FEMALE",
                email=norm_email,
                linked_user_id=new_user.id
            )
            db.add(patient)
            db.flush()
        else:
            patient.linked_user_id = new_user.id

        linked_patient_id = patient.id

        # Initialize default consent
        consent = PatientConsent(
            master_patient_id=patient.id,
            consent_type="FULL_SHARING",
            purpose="TREATMENT",
            status="ACTIVE",
            notes="Default consent directive established during self-registration."
        )
        db.add(consent)

    elif role == "doctor":
        doc_profile = Doctor(
            user_id=new_user.id,
            department=reg_req.facility or "General Medicine & Outpatient",
            license_number=reg_req.license_number or f"MED-REG-{new_user.id}-2026",
            specialty=reg_req.specialty or "Attending Physician"
        )
        db.add(doc_profile)
        db.flush()
        doctor_id = doc_profile.id

    db.commit()

    log_audit_event(
        db=db,
        actor_user_id=new_user.id,
        actor_role=role,
        action="USER_REGISTRATION",
        resource_type="USER",
        resource_id=str(new_user.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"username": new_user.username, "role": role, "email": norm_email}
    )

    return {
        "message": f"Account successfully created for {full_name} ({role}). You may now sign in.",
        "user_id": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "linked_patient_id": linked_patient_id,
        "doctor_id": doctor_id
    }

@router.post("/login", response_model=Token)
def login(login_req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    # Support login by username OR email address
    user = db.query(User).filter(
        (User.username == login_req.username.strip()) | (User.email == login_req.username.strip().lower())
    ).first()

    client_ip = request.client.host if request.client else "unknown"

    if not user or not verify_password(login_req.password, user.hashed_password):
        log_audit_event(
            db=db,
            actor_user_id=user.id if user else None,
            actor_role=user.role if user else "UNKNOWN",
            action="LOGIN_ATTEMPT",
            resource_type="AUTH",
            resource_id=login_req.username,
            outcome="DENIED",
            ip_address=client_ip,
            details={"reason": "Invalid credentials"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log_audit_event(
            db=db,
            actor_user_id=user.id,
            actor_role=user.role,
            action="LOGIN_DEACTIVATED",
            resource_type="AUTH",
            resource_id=str(user.id),
            outcome="DENIED",
            ip_address=client_ip,
            details={"reason": "Account is deactivated"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact your system administrator.",
        )

    # Resolve linked IDs
    linked_patient_id = None
    if user.role == "patient" and user.patient_profile:
        linked_patient_id = user.patient_profile.id

    doctor_id = None
    if user.role == "doctor" and user.doctor_profile:
        doctor_id = user.doctor_profile.id

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )

    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="LOGIN_SUCCESS",
        resource_type="AUTH",
        resource_id=str(user.id),
        outcome="SUCCESS",
        ip_address=client_ip,
        details={"username": user.username, "role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "username": user.username,
        "linked_patient_id": linked_patient_id,
        "doctor_id": doctor_id
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return user

@router.post("/logout")
def logout(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="LOGOUT",
        resource_type="AUTH",
        resource_id=str(user.id),
        outcome="SUCCESS",
        ip_address=client_ip
    )
    return {"message": "Successfully logged out."}
