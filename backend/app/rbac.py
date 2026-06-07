# This file handles Role-Based Access Control (RBAC) verification.
from uuid import UUID
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Workspace, WorkspaceMember, User
from app.auth import get_current_user

# This function retrieves the role of a user in a workspace.
# It first checks if the workspace exists. If it does not, it raises a 404 Not Found.
# Then it queries the membership table. If the user is not in the workspace,
# it raises a 403 Forbidden exception indicating access is denied.
# Otherwise, it returns the role as a plain string: 'admin', 'developer', or 'intern'.
def get_user_role(workspace_id: UUID, user_id: UUID, db: Session) -> str:
    # Check if workspace exists
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found."
        )

    # Check user membership
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You are not a member of this workspace."
        )

    return str(membership.role.value)

# This is a dependency factory function used in FastAPI routes.
# It takes a list of allowed roles (e.g. ['admin', 'developer']) and returns a dependency.
# The returned dependency checks if the currently logged-in user has a role that is present in
# the allowed roles list. If they do not, it raises a 403 Forbidden exception.
def require_role(allowed_roles: list):
    def dependency(
        workspace_id: UUID,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        role = get_user_role(workspace_id, current_user.id, db)
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {role}s do not have permission to perform this action."
            )
        return role
    return dependency

# This function determines if a user role is permitted to access a given environment.
# Admins and developers have access to all environments (development, testing, and production).
# Interns only have access to the development environment and are blocked from testing and production.
def check_environment_access(role: str, environment: str) -> bool:
    if role in ("admin", "developer"):
        return True
    if role == "intern":
        return environment == "development"
    return False
