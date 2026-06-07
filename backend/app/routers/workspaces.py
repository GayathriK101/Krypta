# This file defines the workspace management endpoints: creating workspaces and fetching workspaces the user belongs to.
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Workspace, WorkspaceMember, WorkspaceRole, User
from app.schemas import WorkspaceCreate, WorkspaceOut
from app.auth import get_current_user

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
