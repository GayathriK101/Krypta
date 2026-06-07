# This file defines the SQLAlchemy database models representing the tables: users, workspaces, workspace_members, secrets, and audit_logs.
import datetime
import enum
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Enum as SQLEnum, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class WorkspaceRole(str, enum.Enum):
    """
    Enum defining the available roles a member can have in a workspace.
    """
    admin = "admin"
    developer = "developer"
    intern = "intern"

class EnvironmentType(str, enum.Enum):
    """
    Enum defining the target environments for secrets.
    """
    development = "development"
    testing = "testing"
    production = "production"

class User(Base):
    """
    Represents a registered user in the application.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    workspaces_created = relationship("Workspace", back_populates="creator")
    workspace_memberships = relationship("WorkspaceMember", back_populates="user")
    secrets_updated = relationship("Secret", back_populates="updater")
    audit_logs = relationship("AuditLog", back_populates="user")

class Workspace(Base):
    """
    Represents an isolated team environment (Workspace) where secrets are stored.
    """
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    creator = relationship("User", back_populates="workspaces_created")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    secrets = relationship("Secret", back_populates="workspace", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="workspace", cascade="all, delete-orphan")

class WorkspaceMember(Base):
    """
    Represents the association table mapping users to workspaces with a role.
    """
    __tablename__ = "workspace_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(SQLEnum(WorkspaceRole), nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")

class Secret(Base):
    """
    Represents a stored credential key-value pair belonging to a workspace.
    """
    __tablename__ = "secrets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    environment = Column(SQLEnum(EnvironmentType), nullable=False)
    secret_key = Column(String, nullable=False)
    secret_value_encrypted = Column(String, nullable=False)  # Plaintext for Phase 1
    version = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="secrets")
    updater = relationship("User", back_populates="secrets_updated")

class AuditLog(Base):
    """
    Represents an immutable record of actions taken on workspace secrets or members.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)
    target_key = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
