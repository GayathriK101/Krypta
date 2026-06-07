# This file defines the workspace management endpoints: creating workspaces, listing user workspaces, and managing members.
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Workspace, WorkspaceMember, WorkspaceRole, User, AuditLog
from app.schemas import WorkspaceCreate, WorkspaceOut, WorkspaceMemberCreate, WorkspaceMemberOut, AuditLogOut, WorkspaceMemberUpdate
from app.auth import get_current_user
from app.rbac import require_role, get_user_role

# Initialize the APIRouter for workspaces endpoints
router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


# Creates a new isolated workspace and automatically adds the creator as its admin member.
@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(workspace_in: WorkspaceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new isolated workspace with a given name, sets the current user as creator,
    and adds them as the admin member automatically.
    """
    # Insert the new workspace row
    new_workspace = Workspace(
        name=workspace_in.name,
        created_by=current_user.id
    )
    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)

    # Automatically add the creator as an ADMIN member of this workspace
    new_member = WorkspaceMember(
        workspace_id=new_workspace.id,
        user_id=current_user.id,
        role=WorkspaceRole.admin
    )
    db.add(new_member)
    db.commit()

    return new_workspace


# Returns ONLY the workspaces where the current user has an active membership row.
# Uses DISTINCT to prevent duplicate workspace rows when the same user has
# multiple membership entries (e.g. from data migrations or edge cases).
@router.get("", response_model=List[WorkspaceOut])
def get_workspaces(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Fetches only the workspaces where the current user has an explicit membership row.
    DISTINCT prevents duplicates if multiple membership rows exist for the same user+workspace.
    """
    # Explicit JOIN + DISTINCT ensures one row per workspace, regardless of membership table state
    workspaces = (
        db.query(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .filter(WorkspaceMember.user_id == current_user.id)
        .distinct()
        .all()
    )
    return workspaces


# Adds a user to a workspace by email address. Only workspace admins can do this.
@router.post("/{workspace_id}/members", response_model=WorkspaceMemberOut, status_code=status.HTTP_201_CREATED)
def add_workspace_member(workspace_id: UUID, member_in: WorkspaceMemberCreate, db: Session = Depends(get_db), admin_role: str = Depends(require_role(["admin"]))):
    """
    Adds a new user as a member of the workspace with the specified role.
    Only workspace admins can perform this action.
    """
    # Look up the target user by email address
    user = db.query(User).filter(User.email == member_in.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Reject if the user is already a member of this workspace
    existing_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id
    ).first()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this workspace."
        )

    # Insert the new membership row with the specified role
    new_member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user.id,
        role=member_in.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    # Attach the user email so the Pydantic response schema can serialize it
    new_member.user_email = user.email

    return new_member


# Returns all members of a workspace. Any member of the workspace can view this list.
@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
def get_workspace_members(workspace_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieves the full list of members in a workspace.
    Any authenticated member of the workspace can call this endpoint.
    """
    # Verify the requesting user is actually a member of this workspace
    get_user_role(workspace_id, current_user.id, db)

    # Query members with their email and joined_at date using an explicit JOIN on users
    members = (
        db.query(
            WorkspaceMember.id,
            WorkspaceMember.workspace_id,
            WorkspaceMember.user_id,
            WorkspaceMember.role,
            WorkspaceMember.created_at.label("joined_at"),
            User.email.label("user_email")
        )
        .join(User, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .all()
    )

    return members


# Returns the full audit log for a workspace, newest first.
# ADMIN ONLY — returns all event details including which user performed each action.
@router.get("/{workspace_id}/audit-logs", response_model=List[AuditLogOut])
def get_workspace_audit_logs(workspace_id: UUID, db: Session = Depends(get_db), admin_role: str = Depends(require_role(["admin"]))):
    """
    Retrieves the complete audit log for the workspace, ordered newest-first.
    Left-joins users table to include the email of the user who performed each action.
    Only workspace admins can access this endpoint.
    """
    # Left outer join so logs from deleted users still appear (user_email will be None)
    logs = (
        db.query(
            AuditLog.id,
            AuditLog.action,
            AuditLog.target_key,
            AuditLog.timestamp,
            AuditLog.user_id,
            User.email.label("user_email")
        )
        .outerjoin(User, AuditLog.user_id == User.id)
        .filter(AuditLog.workspace_id == workspace_id)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )

    return logs


# Returns the 5 most recent audit log entries for the live feed strip.
# Available to ALL workspace members (admin, developer, intern).
# Does NOT expose other users' email addresses — only action, key, and timestamp are returned.
@router.get("/{workspace_id}/audit-logs/recent", response_model=List[AuditLogOut])
def get_recent_audit_logs(workspace_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns the 5 most recent audit log entries for the workspace live feed strip.
    Accessible by any workspace member. Does not reveal other users' details.
    """
    # Verify the caller is actually a member of this workspace before returning any logs
    get_user_role(workspace_id, current_user.id, db)

    # Fetch the 5 newest log entries — user_email is intentionally omitted for non-admin callers
    logs = (
        db.query(
            AuditLog.id,
            AuditLog.action,
            AuditLog.target_key,
            AuditLog.timestamp,
            AuditLog.user_id,
        )
        .filter(AuditLog.workspace_id == workspace_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(5)
        .all()
    )

    return logs


# Updates the role of a specific workspace member. Admin only.
# Admins cannot change their own role to prevent accidental lockout.
@router.patch("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberOut)
def update_workspace_member_role(
    workspace_id: UUID,
    user_id: UUID,
    member_update: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    admin_role: str = Depends(require_role(["admin"])),
    current_user: User = Depends(get_current_user)
):
    """
    Updates the role of an existing workspace member.
    Admins cannot update their own role — this prevents accidental self-lockout.
    """
    # Block the admin from changing their own role
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot update your own role."
        )

    # Find the target membership row
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member not found."
        )

    # Apply the role change and persist
    membership.role = member_update.role
    db.commit()
    db.refresh(membership)

    # Re-query with user email so the response includes user_email and joined_at
    result = (
        db.query(
            WorkspaceMember.id,
            WorkspaceMember.workspace_id,
            WorkspaceMember.user_id,
            WorkspaceMember.role,
            WorkspaceMember.created_at.label("joined_at"),
            User.email.label("user_email")
        )
        .join(User, WorkspaceMember.user_id == User.id)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        )
        .first()
    )

    return result


# Removes a member from a workspace permanently. Admin only.
# Admins cannot remove themselves to prevent losing admin access.
@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_workspace_member(
    workspace_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    admin_role: str = Depends(require_role(["admin"])),
    current_user: User = Depends(get_current_user)
):
    """
    Permanently removes a member from the workspace.
    Instantly revokes all their access to workspace secrets and resources.
    Admins cannot remove themselves.
    """
    # Block self-removal to prevent the admin from losing workspace access
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from the workspace."
        )

    # Find the membership row to delete
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member not found."
        )

    # Delete the membership row — this immediately revokes all workspace access
    db.delete(membership)
    db.commit()
    return
