// Modal component allowing workspace admins to add new users as developers or interns.
'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';
import { addMember } from '../lib/api';
import { WorkspaceRole } from '../types';

interface AddMemberModalProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMemberModal({ workspaceId, onClose, onSuccess }: AddMemberModalProps) {
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
      toast.success('Member added');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to add member';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-[400px] bg-[#1a1d26] border border-border-krypta rounded-[8px] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border-krypta flex items-center justify-between">
          <span className="text-[14px] font-semibold text-text-primary">Add Member</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Email Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. employee@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent-purple"
            />
          </div>

          {/* Role Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Workspace Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent-purple"
            >
              <option value="developer">Developer</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-border-krypta">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-bg-hover hover:bg-[#20242f] text-text-primary border border-border-krypta text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent-purple hover:bg-[#6b62ce] text-white text-[13px] font-medium rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Member</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
