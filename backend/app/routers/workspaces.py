# This file defines the workspace management endpoints: creating workspaces and fetching workspaces the user belongs to.
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Workspace, WorkspaceMember, WorkspaceRole, User
from app.schemas import WorkspaceCreate, WorkspaceOut, WorkspaceMemberCreate, WorkspaceMemberOut
from app.auth import get_current_user
from app.rbac import require_role

# Initialize the APIRouter for workspaces endpoints
router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(workspace_in: WorkspaceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new isolated workspace with a given name, sets the current user as creator, and adds them as the admin member.
    """
    # Create the workspace entry
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

@router.get("", response_model=List[WorkspaceOut])
def get_workspaces(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Fetches all workspaces where the currently authenticated user is registered as a member.
    """
    # Query workspaces by joining the WorkspaceMember association table for the current user
    workspaces = db.query(Workspace).join(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).all()
    return workspaces

@router.post("/{workspace_id}/members", response_model=WorkspaceMemberOut, status_code=status.HTTP_201_CREATED)
def add_workspace_member(workspace_id: UUID, member_in: WorkspaceMemberCreate, db: Session = Depends(get_db), admin_role: str = Depends(require_role(["admin"]))):
    """
    Adds a new user as a member to the workspace with a specific role. Only workspace admins can perform this action.
    """
    # Look up the user by their email address
    user = db.query(User).filter(User.email == member_in.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Check if the user is already a member of this workspace
    existing_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id
    ).first()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this workspace."
        )

    # Add the user to workspace members with the specified role
    new_member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user.id,
        role=member_in.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return new_member
