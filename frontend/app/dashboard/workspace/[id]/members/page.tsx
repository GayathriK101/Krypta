// Members management page: lists workspace members, inline role editing, remove with confirm, and add member modal.
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, Trash2, AlertCircle, Loader2, X, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { getWorkspaces, getMembers, addMember, updateMemberRole, removeMember } from '../../../../../lib/api';
import { useAuthStore } from '../../../../../lib/store';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../../../../../types';

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Add Member Modal ────────────────────────────────────────────────────────

interface AddMemberModalProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddMemberModal({ workspaceId, onClose, onSuccess }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('developer');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await addMember(workspaceId, email.trim(), role);
      toast.success('Member added successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      // Surface exact backend error message to the user
      const msg = err.response?.data?.detail || 'Failed to add member';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-[400px] bg-[#1a1d26] border border-[#2a2d35] rounded-[8px] overflow-hidden">

        {/* Modal header */}
        <div className="px-5 py-4 border-b border-[#2a2d35] flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[#f1f1f1]">Add Member</span>
          <button
            onClick={onClose}
            className="text-[#555] hover:text-[#f1f1f1] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-[#555] tracking-wider block">
              Email Address
            </label>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-[6px] px-3 py-2 text-[13px] text-[#f1f1f1] placeholder:text-[#555] focus:outline-none focus:border-[#7f77dd] transition-colors"
            />
          </div>

          {/* Role dropdown — never includes admin */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-[#555] tracking-wider block">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-[6px] px-3 py-2 text-[13px] text-[#f1f1f1] focus:outline-none focus:border-[#7f77dd] transition-colors"
            >
              <option value="developer">developer</option>
              <option value="intern">intern</option>
            </select>
            <p className="text-[11px] text-[#555]">
              Developers can read/write all environments. Interns can only read development secrets.
            </p>
          </div>

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#2a2d35]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-[#0f1117] hover:bg-[#1a1d26] text-[#f1f1f1] border border-[#2a2d35] text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#7f77dd] hover:bg-[#6b62ce] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Members Table ────────────────────────────────────────────────────────────

interface MembersTableProps {
  workspaceId: string;
  members: WorkspaceMember[];
  currentEmail: string | null;
  onRefresh: () => void;
}

function MembersTable({ workspaceId, members, currentEmail, onRefresh }: MembersTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Format the joined_at ISO date to a readable string e.g. "Jun 6, 2026"
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  // Avatar background color driven by role
  const avatarBg = (role: WorkspaceRole) => {
    if (role === 'admin') return 'bg-[#7f77dd]';
    if (role === 'developer') return 'bg-[#1d9e75]';
    return 'bg-[#2a2d35]';
  };

  // Pill badge styling per role
  const rolePill = (role: WorkspaceRole) => {
    if (role === 'admin') return 'bg-[#1e1b3a] text-[#7f77dd]';
    if (role === 'developer') return 'bg-[#0a1f18] text-[#1d9e75]';
    return 'bg-[#1a1d26] text-[#888]';
  };

  // Handle inline role change from the dropdown
  const handleRoleChange = async (userId: string, newRole: WorkspaceRole) => {
    setUpdatingId(userId);
    try {
      await updateMemberRole(workspaceId, userId, newRole);
      toast.success('Role updated');
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update role';
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle member removal after confirmation
  const handleRemove = async (member: WorkspaceMember) => {
    if (member.user_email === currentEmail) {
      toast.error('You cannot remove yourself from the workspace');
      setConfirmDeleteId(null);
      return;
    }
    try {
      await removeMember(workspaceId, member.user_id);
      toast.success('Member removed');
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to remove member';
      toast.error(msg);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="w-full overflow-x-auto border border-[#2a2d35] rounded-[8px] bg-[#0a0c10]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#2a2d35] bg-[#0f1117] text-[10px] uppercase text-[#555] font-mono tracking-wider">
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Joined</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2d35] text-[13px]">
          {members.map((member) => {
            const isSelf = member.user_email === currentEmail;
            const email = member.user_email || 'Unknown user';
            const initials = email.substring(0, 2).toUpperCase();
            const isConfirming = confirmDeleteId === member.user_id;

            return (
              <tr key={member.id} className="hover:bg-[#1a1d26] transition-colors">

                {/* USER */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[12px] font-bold text-white shrink-0 ${avatarBg(member.role)}`}>
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#f1f1f1] font-medium truncate">{email}</span>
                      {isSelf && (
                        <span className="text-[10px] text-[#7f77dd] font-mono uppercase font-semibold">You</span>
                      )}
                    </div>
                  </div>
                </td>

                {/* ROLE */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {isSelf ? (
                    // Cannot change own role
                    <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold ${rolePill(member.role)}`}>
                      {member.role}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        disabled={updatingId === member.user_id}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value as WorkspaceRole)}
                        className="bg-[#0f1117] border border-[#2a2d35] rounded-[4px] px-2 py-1 text-[12px] font-mono text-[#f1f1f1] focus:outline-none focus:border-[#7f77dd] transition-colors cursor-pointer"
                      >
                        <option value="admin">admin</option>
                        <option value="developer">developer</option>
                        <option value="intern">intern</option>
                      </select>
                      {updatingId === member.user_id && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7f77dd]" />
                      )}
                    </div>
                  )}
                </td>

                {/* JOINED */}
                <td className="px-4 py-3 text-[#555] whitespace-nowrap font-mono text-[12px]">
                  {formatDate(member.joined_at)}
                </td>

                {/* ACTIONS */}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {isSelf ? (
                    <span className="text-[12px] text-[#555] italic">—</span>
                  ) : isConfirming ? (
                    // Inline confirm dialog
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-1.5 bg-[#2a1008] border border-[#d85a30] rounded-[6px] px-2.5 py-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#d85a30] shrink-0" />
                        <span className="text-[11px] text-[#d85a30] font-medium whitespace-nowrap">
                          Remove {email.split('@')[0]}?
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemove(member)}
                        className="px-2.5 py-1 bg-[#d85a30] hover:bg-[#b0431b] text-white text-[11px] font-bold rounded-[4px] transition-colors cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 bg-[#1a1d26] hover:bg-[#20242f] text-[#f1f1f1] text-[11px] font-bold rounded-[4px] border border-[#2a2d35] transition-colors cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(member.user_id)}
                      title={`Remove ${email} from workspace`}
                      className="text-[#555] hover:text-[#d85a30] p-1.5 rounded-[4px] hover:bg-[#1a1d26] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembersPage({ params }: PageProps) {
  const router = useRouter();
  const { id: workspaceId } = use(params);
  const { role, email: currentEmail } = useAuthStore();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch the members list from the backend
  const fetchMembers = async () => {
    try {
      const data = await getMembers(workspaceId);
      setMembers(data);
    } catch (err) {
      toast.error('Failed to load members');
    }
  };

  useEffect(() => {
    // Guard: admin only — redirect everyone else
    if (role && role !== 'admin') {
      toast.error('Access denied: admins only');
      router.push('/dashboard');
      return;
    }

    const init = async () => {
      setLoading(true);
      try {
        const workspaces = await getWorkspaces();
        const ws = workspaces.find((w) => w.id === workspaceId);
        if (!ws) {
          toast.error('Workspace not found');
          router.push('/dashboard');
          return;
        }
        setWorkspace(ws);
        await fetchMembers();
      } catch (err) {
        toast.error('Failed to load workspace');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [workspaceId, role]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#555] font-mono text-[13px] select-none">
        <Loader2 className="w-5 h-5 animate-spin text-[#7f77dd] mr-2" />
        <span>Loading members...</span>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="p-8 flex-1 flex flex-col min-h-screen select-none">

      {/* Page header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#2a2d35] mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#f1f1f1] tracking-tight">Members</h1>
          <p className="text-[12px] text-[#555] mt-1">{workspace.name}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#7f77dd] hover:bg-[#6b62ce] text-white px-4 py-2 text-[13px] font-medium rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Workspace isolation info box */}
      <div className="bg-[#1a1d26] border-l-2 border-[#7f77dd] px-4 py-3 rounded-r-[6px] mb-6">
        <p className="text-[13px] text-[#555] italic leading-5">
          Members can only access workspaces they are added to. Removing a member instantly revokes
          all their access to this workspace.
        </p>
      </div>

      {/* Members count badge */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-[#555]" />
        <span className="text-[12px] text-[#555]">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table or empty state */}
      {members.length === 0 ? (
        <div className="flex-1 border border-dashed border-[#2a2d35] rounded-[8px] py-16 text-center flex flex-col items-center justify-center">
          <Users className="w-8 h-8 text-[#555] mb-3" />
          <h3 className="text-[13px] font-semibold text-[#f1f1f1]">No members yet</h3>
          <p className="text-[12px] text-[#555] mt-1 max-w-[280px]">
            Add teammates to give them access to this workspace based on their role.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-[#1a1d26] border border-[#2a2d35] hover:bg-[#20242f] text-[#f1f1f1] text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
          >
            Add first member
          </button>
        </div>
      ) : (
        <MembersTable
          workspaceId={workspaceId}
          members={members}
          currentEmail={currentEmail}
          onRefresh={fetchMembers}
        />
      )}

      {/* Add member modal */}
      {showAddModal && (
        <AddMemberModal
          workspaceId={workspaceId}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchMembers}
        />
      )}
    </div>
  );
}
