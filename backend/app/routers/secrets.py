# This file defines the secret management endpoints: creating/updating secrets, listing secrets, and revealing individual secrets with audit logging.
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Secret, AuditLog, User, EnvironmentType
from app.schemas import SecretCreate, SecretOut
from app.auth import get_current_user
from app.crypto import encrypt_value, decrypt_value
from app.rbac import get_user_role, check_environment_access

# Initialize the APIRouter for secrets endpoints
router = APIRouter(prefix="/workspaces", tags=["Secrets"])


# Helper that inserts one row into audit_logs using the existing db session.
# Called by every endpoint that needs to record an action.
def write_audit_log(db: Session, workspace_id: UUID, user_id: UUID, action: str, target_key: str):
    audit_entry = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        target_key=target_key
    )
    db.add(audit_entry)
    db.commit()


# Creates a new secret or updates an existing secret with the same key and environment.
# Encrypts the value with AES-256-GCM before saving.
# Logs SECRET_CREATE or SECRET_UPDATE on success.
# Logs BLOCKED_ACCESS if RBAC denies environment access or write permission.
@router.post("/{workspace_id}/secrets", response_model=SecretOut, status_code=status.HTTP_201_CREATED)
def create_or_update_secret(
    workspace_id: UUID,
    secret_in: SecretCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new secret or updates an existing one (increments version).
    Writes SECRET_CREATE, SECRET_UPDATE, or BLOCKED_ACCESS to the audit log.
    """
    # Get user's role — also verifies workspace membership and workspace existence
    role = get_user_role(workspace_id, current_user.id, db)

    # Block access if the role cannot read/write this environment
    if not check_environment_access(role, secret_in.environment):
        write_audit_log(db, workspace_id, current_user.id, "BLOCKED_ACCESS", secret_in.secret_key)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {role}s cannot access {secret_in.environment.value} secrets"
        )

    # Block write access for roles that are read-only (interns)
    if role not in ("admin", "developer"):
        write_audit_log(db, workspace_id, current_user.id, "BLOCKED_ACCESS", secret_in.secret_key)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {role}s do not have permission to write secrets"
        )

    # Check if an active secret with the same key + environment already exists
    existing_secret = db.query(Secret).filter(
        Secret.workspace_id == workspace_id,
        Secret.secret_key == secret_in.secret_key,
        Secret.environment == secret_in.environment,
        Secret.is_active == True
    ).first()

    # Encrypt the plaintext value before persisting
    encrypted_value = encrypt_value(secret_in.secret_value)

    if existing_secret:
        # Update the existing secret — bump version and record who changed it
        existing_secret.secret_value_encrypted = encrypted_value
        existing_secret.version += 1
        existing_secret.updated_by = current_user.id
        db.commit()
        db.refresh(existing_secret)
        active_secret = existing_secret
        audit_action = "SECRET_UPDATE"
    else:
        # Create a brand new secret row at version 1
        active_secret = Secret(
            workspace_id=workspace_id,
            environment=secret_in.environment,
            secret_key=secret_in.secret_key,
            secret_value_encrypted=encrypted_value,
            version=1,
            is_active=True,
            updated_by=current_user.id
        )
        db.add(active_secret)
        db.commit()
        db.refresh(active_secret)
        audit_action = "SECRET_CREATE"

    # Write the audit log for the successful create or update
    write_audit_log(db, workspace_id, current_user.id, audit_action, secret_in.secret_key)

    # Decrypt before returning so the client receives plaintext
    decrypted_val = decrypt_value(active_secret.secret_value_encrypted)

    return SecretOut(
        id=active_secret.id,
        workspace_id=active_secret.workspace_id,
        environment=active_secret.environment,
        secret_key=active_secret.secret_key,
        secret_value=decrypted_val,
        version=active_secret.version,
        is_active=active_secret.is_active,
        updated_by=active_secret.updated_by,
        updated_at=active_secret.updated_at
    )


# Lists all active secrets in a workspace, filtered by the user's role.
# Decrypts every secret value before returning.
# Does NOT write an audit log — listing is silent. Only /reveal writes SECRET_VIEW.
@router.get("/{workspace_id}/secrets", response_model=List[SecretOut])
def get_secrets(
    workspace_id: UUID,
    environment: Optional[EnvironmentType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all active secrets the user has access to.
    No audit log is written — listing is a silent operation.
    Use the /reveal endpoint to trigger a SECRET_VIEW audit entry.
    """
    # Get user's role — verifies workspace membership and workspace existence
    role = get_user_role(workspace_id, current_user.id, db)

    # If a specific environment is requested, validate the user has access to it
    if environment is not None:
        if not check_environment_access(role, environment):
            # Log the blocked environment access attempt
            write_audit_log(db, workspace_id, current_user.id, "BLOCKED_ACCESS", f"{environment.value}_secrets")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {role}s cannot access {environment.value} secrets"
            )
        secrets = db.query(Secret).filter(
            Secret.workspace_id == workspace_id,
            Secret.environment == environment,
            Secret.is_active == True
        ).all()
    else:
        # Interns only see development secrets; admins and developers see everything
        if role == "intern":
            secrets = db.query(Secret).filter(
                Secret.workspace_id == workspace_id,
                Secret.environment == "development",
                Secret.is_active == True
            ).all()
        else:
            secrets = db.query(Secret).filter(
                Secret.workspace_id == workspace_id,
                Secret.is_active == True
            ).all()

    # Decrypt and serialize each secret for the client
    results = []
    for s in secrets:
        decrypted_val = decrypt_value(s.secret_value_encrypted)
        results.append(
            SecretOut(
                id=s.id,
                workspace_id=s.workspace_id,
                environment=s.environment,
                secret_key=s.secret_key,
                secret_value=decrypted_val,
                version=s.version,
                is_active=s.is_active,
                updated_by=s.updated_by,
                updated_at=s.updated_at
            )
        )

    return results


# Reveals the decrypted value of a single secret and writes a SECRET_VIEW audit log.
# This is the ONLY place SECRET_VIEW is ever logged — triggered by the user clicking
# the eye icon to reveal a specific secret, not by the page loading.
@router.get("/{workspace_id}/secrets/{secret_id}/reveal")
def reveal_secret(
    workspace_id: UUID,
    secret_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Decrypts and returns a single secret's value.
    Writes a SECRET_VIEW audit log entry — this is the only trigger for SECRET_VIEW.
    Called when the user explicitly clicks the eye icon, not on page load.
    """
    # Get user's role — verifies workspace membership and workspace existence
    role = get_user_role(workspace_id, current_user.id, db)

    # Look up the specific secret
    secret = db.query(Secret).filter(
        Secret.id == secret_id,
        Secret.workspace_id == workspace_id,
        Secret.is_active == True
    ).first()

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found."
        )

    # Check if the user's role has read access to this secret's environment
    if not check_environment_access(role, secret.environment):
        write_audit_log(db, workspace_id, current_user.id, "BLOCKED_ACCESS", secret.secret_key)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {role}s cannot access {secret.environment.value} secrets"
        )

    # Log the explicit reveal action — this is the intentional SECRET_VIEW event
    write_audit_log(db, workspace_id, current_user.id, "SECRET_VIEW", secret.secret_key)

    # Decrypt and return just the value
    decrypted_val = decrypt_value(secret.secret_value_encrypted)
    return {"secret_id": str(secret_id), "secret_key": secret.secret_key, "secret_value": decrypted_val}
