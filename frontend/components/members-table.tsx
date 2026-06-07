// Workspace members list rendering table with role updates and deletion guards.
'use client';

import React, { useState } from 'react';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { WorkspaceMember, WorkspaceRole } from '../types';
import { updateMemberRole, removeMember } from '../lib/api';
import { useAuthStore } from '../lib/store';

interface MembersTableProps {
  workspaceId: string;
  members: WorkspaceMember[];
  onRefresh: () => void;
}

export default function MembersTable({ workspaceId, members, onRefresh }: MembersTableProps) {
  const { email: currentEmail, role: currentRole } = useAuthStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Get Initials for avatar
  const getInitials = (emailStr: string) => {
    return emailStr.substring(0, 2).toUpperCase();
  };

  // Get avatar background by role
  const getAvatarBg = (role: WorkspaceRole) => {
    if (role === 'admin') return 'bg-[#7f77dd] text-white';
    if (role === 'developer') return 'bg-[#1d9e75] text-white';
    return 'bg-[#555] text-white'; // intern
  };

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

  const handleRemoveMember = async (userId: string, memberEmail: string) => {
    try {
      await removeMember(workspaceId, userId);
      toast.success('Member removed');
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to remove member';
      toast.error(msg);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="w-full border border-border-krypta rounded-[8px] overflow-hidden bg-bg-sidebar select-none">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border-krypta bg-bg-main text-[10px] uppercase text-text-muted font-mono tracking-wider">
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Joined</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-krypta text-[13px]">
          {members.map((member) => {
            const isSelf = member.user_email === currentEmail;
            const userEmail = member.user_email || 'Workspace User';
            const joinedDate = 'Jun 6, 2026'; // Mock or default since database does not store it

            return (
              <tr key={member.id} className="hover:bg-bg-hover transition-colors">
                {/* USER COLUMN */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[12px] font-bold shrink-0 ${getAvatarBg(member.role)}`}>
                      {getInitials(userEmail)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-text-primary font-medium">{userEmail}</span>
                      {isSelf && <span className="text-[10px] text-accent-purple font-mono uppercase font-semibold">You</span>}
                    </div>
                  </div>
                </td>

                {/* ROLE COLUMN */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {isSelf || currentRole !== 'admin' ? (
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#1a1d26] text-text-primary font-mono text-[12px] capitalize">
                      {member.role}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        disabled={updatingId === member.user_id}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value as WorkspaceRole)}
                        className="bg-bg-main border border-border-krypta rounded-[4px] px-2 py-1 text-[12px] font-mono text-text-primary focus:outline-none focus:border-accent-purple"
                      >
                        <option value="admin">admin</option>
                        <option value="developer">developer</option>
                        <option value="intern">intern</option>
                      </select>
                      {updatingId === member.user_id && <Loader2 className="w-3 h-3 animate-spin text-accent-purple" />}
                    </div>
                  )}
                </td>

                {/* JOINED COLUMN */}
                <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                  {joinedDate}
                </td>

                {/* ACTIONS COLUMN */}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {isSelf || currentRole !== 'admin' ? (
                    <span className="text-[12px] text-text-muted italic">No actions</span>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {confirmDeleteId === member.user_id ? (
                        <div className="flex items-center gap-2 bg-[#2a1008] border border-danger-coral rounded-[6px] px-2 py-1">
                          <AlertCircle className="w-3.5 h-3.5 text-danger-coral" />
                          <span className="text-[11px] text-danger-coral font-medium">Confirm?</span>
                          <button
                            onClick={() => handleRemoveMember(member.user_id, userEmail)}
                            className="bg-danger-coral hover:bg-[#b0431b] text-white text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-bg-hover hover:bg-[#20242f] text-text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-border-krypta transition-colors cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(member.user_id)}
                          className="text-text-muted hover:text-danger-coral p-1 rounded hover:bg-bg-hover transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
