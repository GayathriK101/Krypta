# This file defines the secret management endpoints: creating/updating secrets and listing active secrets for a workspace.
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Workspace, WorkspaceMember, Secret, AuditLog, User, EnvironmentType
from app.schemas import SecretCreate, SecretOut
from app.auth import get_current_user
from app.crypto import encrypt_value, decrypt_value
from app.rbac import get_user_role, check_environment_access

# Initialize the APIRouter for secrets endpoints
router = APIRouter(prefix="/workspaces", tags=["Secrets"])

# This endpoint handles creating a new secret or updating an existing secret key.
# It intercepts the plaintext secret value, encrypts it using AES-256-GCM, and saves only
# the encrypted version to the database. It then decrypts the saved value to return the plaintext to the user.
@router.post("/{workspace_id}/secrets", response_model=SecretOut, status_code=status.HTTP_201_CREATED)
def create_or_update_secret(workspace_id: UUID, secret_in: SecretCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new secret in the workspace, or updates an existing secret by incrementing its version, and writes an audit log.
    """
    # Get user's role (verifies workspace membership and workspace existence)
    role = get_user_role(workspace_id, current_user.id, db)

    # Check if the user's role has access to the target environment
    if not check_environment_access(role, secret_in.environment):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {role}s cannot access {secret_in.environment.value} secrets"
        )

    # Check if the user is allowed to write secrets (only admins and developers can write)
    if role not in ("admin", "developer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {role}s do not have permission to write secrets"
        )

    # Check if an active secret with the same key and environment already exists
    existing_secret = db.query(Secret).filter(
        Secret.workspace_id == workspace_id,
        Secret.secret_key == secret_in.secret_key,
        Secret.environment == secret_in.environment,
        Secret.is_active == True
    ).first()

    # Encrypt the plaintext secret value before saving it to the database
    encrypted_value = encrypt_value(secret_in.secret_value)

    if existing_secret:
        # Increment the version of the secret and update the value and updater info
        existing_secret.secret_value_encrypted = encrypted_value
        existing_secret.version += 1
        existing_secret.updated_by = current_user.id
        db.commit()
        db.refresh(existing_secret)
        active_secret = existing_secret
        action = "UPDATE"
    else:
        # Create a brand new secret with version set to 1
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
        action = "CREATE"

    # Create an audit log record for the operation
    audit_log = AuditLog(
        workspace_id=workspace_id,
        user_id=current_user.id,
        action=action,
        target_key=secret_in.secret_key
    )
    db.add(audit_log)
    db.commit()

    # Decrypt the saved encrypted value to return the plaintext to the user
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

# This endpoint lists all active secrets in a workspace.
# It fetches the encrypted secret values from the database, decrypts each value,
# and returns the plaintext values inside the response schema.
@router.get("/{workspace_id}/secrets", response_model=List[SecretOut])
def get_secrets(
    workspace_id: UUID,
    environment: Optional[EnvironmentType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all active secrets stored within the specified workspace.
    """
    # Get user's role (verifies workspace membership and workspace existence)
    role = get_user_role(workspace_id, current_user.id, db)

    # If a specific environment is requested, check if the user has access to it
    if environment is not None:
        if not check_environment_access(role, environment):
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
        # Filter returned secrets based on role:
        # - admin/developer -> return all environments
        # - intern          -> return ONLY development secrets
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
    
    # Decrypt the secrets and map them to the SecretOut schema for the client response
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

