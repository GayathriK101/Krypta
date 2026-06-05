# This file defines the Pydantic validation schemas for data requests and responses across all endpoints.
from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models import WorkspaceRole, EnvironmentType

# ----------------- User Schemas -----------------

class UserCreate(BaseModel):
    """
    Schema representing user credentials required for registering a new account.
    """
    email: EmailStr = Field(..., description="The unique email address of the user.")
    password: str = Field(..., min_length=8, description="The user's password, must be at least 8 characters.")

class UserOut(BaseModel):
    """
    Schema representing the user data returned by the API (excluding sensitive info like hashes).
    """
    id: UUID
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Auth Token Schemas -----------------

class Token(BaseModel):
    """
    Schema representing the access token response returned after successful login.
    """
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """
    Schema representing the payload stored inside the decoded JWT token.
    """
    email: Optional[str] = None

# ----------------- Workspace Schemas -----------------

class WorkspaceCreate(BaseModel):
    """
    Schema representing request body required to create a new workspace.
    """
    name: str = Field(..., min_length=1, max_length=100, description="The name of the workspace.")

class WorkspaceOut(BaseModel):
    """
    Schema representing the workspace information returned by the API.
    """
    id: UUID
    name: str
    created_by: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkspaceMemberOut(BaseModel):
    """
    Schema representing a member mapping inside a workspace.
    """
    id: UUID
    workspace_id: UUID
    user_id: UUID
    role: WorkspaceRole

    model_config = ConfigDict(from_attributes=True)

# ----------------- Secret Schemas -----------------

class SecretCreate(BaseModel):
    """
    Schema representing request body required to create or update a secret.
    """
    environment: EnvironmentType = Field(..., description="The target environment for the secret (development/testing/production).")
    secret_key: str = Field(..., min_length=1, description="The key of the secret.")
    secret_value: str = Field(..., min_length=1, description="The plain-text value of the secret.")

class SecretOut(BaseModel):
    """
    Schema representing the secret information returned by the API.
    """
    id: UUID
    workspace_id: UUID
    environment: EnvironmentType
    secret_key: str
    secret_value: str = Field(..., serialization_alias="secret_value", validation_alias="secret_value_encrypted")  # Maps db secret_value_encrypted to secret_value
    version: int
    is_active: bool
    updated_by: Optional[UUID]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
