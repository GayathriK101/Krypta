// This file defines the TypeScript interfaces representing models and API errors in Krypta.

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export type WorkspaceRole = 'admin' | 'developer' | 'intern';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  user_email?: string;
  joined_at?: string; // ISO datetime string from backend
}

export type EnvironmentType = 'development' | 'testing' | 'production';

export interface Secret {
  id: string;
  workspace_id: string;
  environment: EnvironmentType;
  secret_key: string;
  secret_value: string;
  version: number;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  target_key: string;
  timestamp: string;
  user_email?: string; // from joined users table
}

export interface ApiError {
  detail: string;
}
