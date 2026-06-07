# This file defines the secret management endpoints: creating/updating secrets and listing active secrets for a workspace.
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Workspace, WorkspaceMember, Secret, AuditLog, User
from app.schemas import SecretCreate, SecretOut
from app.auth import get_current_user
from app.crypto import encrypt_value, decrypt_value

# Initialize the APIRouter for secrets endpoints
router = APIRouter(prefix="/workspaces", tags=["Secrets"])

# This helper function checks whether a user has permission to access a workspace.
# It queries the workspace and membership tables, throwing an HTTP error if the workspace doesn't exist
# or if the user is not a member of it.
def verify_workspace_membership(workspace_id: UUID, user_id: UUID, db: Session) -> None:
    """
    Verifies that the workspace exists and the user is a member of the workspace; raises 404 or 403 exceptions if not.
    """
    # Verify the workspace exists first
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found."
        )
    
    # Check if the user is a member of the workspace
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You are not a member of this workspace."
        )

# This endpoint handles creating a new secret or updating an existing secret key.
# It intercepts the plaintext secret value, encrypts it using AES-256-GCM, and saves only
# the encrypted version to the database. It then decrypts the saved value to return the plaintext to the user.
@router.post("/{workspace_id}/secrets", response_model=SecretOut, status_code=status.HTTP_201_CREATED)
def create_or_update_secret(workspace_id: UUID, secret_in: SecretCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new secret in the workspace, or updates an existing secret by incrementing its version, and writes an audit log.
    """
    # Verify the current user belongs to the workspace
    verify_workspace_membership(workspace_id, current_user.id, db)

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
def get_secrets(workspace_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieves all active secrets stored within the specified workspace.
    """
    # Verify the current user belongs to the workspace
    verify_workspace_membership(workspace_id, current_user.id, db)

    # Query active secrets belonging to the workspace
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

