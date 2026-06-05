# This file defines the secret management endpoints: creating/updating secrets and listing active secrets for a workspace.
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Workspace, WorkspaceMember, Secret, AuditLog, User
from app.schemas import SecretCreate, SecretOut
from app.auth import get_current_user

# Initialize the APIRouter for secrets endpoints
router = APIRouter(prefix="/workspaces", tags=["Secrets"])

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

    if existing_secret:
        # Increment the version of the secret and update the value and updater info
        existing_secret.secret_value_encrypted = secret_in.secret_value
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
            secret_value_encrypted=secret_in.secret_value,
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

    return active_secret

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
    
    return secrets
