// Axios API client wrapper with request interceptor for JWT authorization.
import axios from 'axios';
import { Workspace, Secret, AuditLog, WorkspaceMember, WorkspaceRole, EnvironmentType } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

// Automatically inject JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('krypta_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Authentication endpoints
export const login = async (email: string, password: string) => {
  // FastAPI OAuth2PasswordRequestForm expects URL-encoded form data (username & password)
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data; // { access_token: string, token_type: string }
};

export const register = async (email: string, password: string) => {
  const response = await api.post('/auth/register', { email, password });
  return response.data;
};

// Workspace endpoints
export const getWorkspaces = async (): Promise<Workspace[]> => {
  const response = await api.get('/workspaces');
  return response.data;
};

export const createWorkspace = async (name: string): Promise<Workspace> => {
  const response = await api.post('/workspaces', { name });
  return response.data;
};

// Secret endpoints
export const getSecrets = async (workspaceId: string, environment?: EnvironmentType): Promise<Secret[]> => {
  const params: Record<string, string> = {};
  if (environment) {
    params.environment = environment;
  }
  const response = await api.get(`/workspaces/${workspaceId}/secrets`, { params });
  return response.data;
};

export const createSecret = async (
  workspaceId: string,
  environment: EnvironmentType,
  secretKey: string,
  secretValue: string
): Promise<Secret> => {
  const response = await api.post(`/workspaces/${workspaceId}/secrets`, {
    environment,
    secret_key: secretKey,
    secret_value: secretValue,
  });
  return response.data;
};

// Workspace Member endpoints
export const getMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  const response = await api.get(`/workspaces/${workspaceId}/members`);
  return response.data;
};

export const addMember = async (
  workspaceId: string,
  email: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> => {
  const response = await api.post(`/workspaces/${workspaceId}/members`, { email, role });
  return response.data;
};

export const updateMemberRole = async (
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> => {
  const response = await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
  return response.data;
};

export const removeMember = async (workspaceId: string, userId: string): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
};

// Audit Log endpoints

// Full audit log — admin only, returns all logs with user details
export const getAuditLogs = async (workspaceId: string): Promise<AuditLog[]> => {
  const response = await api.get(`/workspaces/${workspaceId}/audit-logs`);
  return response.data;
};

// Recent audit log — accessible to any member, returns last 5 entries without user details
export const getRecentAuditLogs = async (workspaceId: string): Promise<AuditLog[]> => {
  const response = await api.get(`/workspaces/${workspaceId}/audit-logs/recent`);
  return response.data;
};

// Reveal a single secret's decrypted value — triggers SECRET_VIEW audit log
export const revealSecret = async (workspaceId: string, secretId: string): Promise<{ secret_id: string; secret_key: string; secret_value: string }> => {
  const response = await api.get(`/workspaces/${workspaceId}/secrets/${secretId}/reveal`);
  return response.data;
};

export default api;
