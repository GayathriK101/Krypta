// Modal component to create a new secret or update an existing one.
'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';
import { createSecret } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { EnvironmentType } from '../types';

interface AddSecretModalProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSecretModal({ workspaceId, onClose, onSuccess }: AddSecretModalProps) {
  const { role } = useAuthStore();
  const [environment, setEnvironment] = useState<EnvironmentType>('development');
  const [secretKey, setSecretKey] = useState('');
  const [secretValue, setSecretValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim() || !secretValue.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await createSecret(workspaceId, environment, secretKey.trim(), secretValue.trim());
      toast.success('Secret added successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to add secret';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Restrict environments: interns can't write anyway, but if they could, restrict options.
  const environments: { label: string; value: EnvironmentType }[] = [
    { label: 'Development', value: 'development' },
    { label: 'Testing', value: 'testing' },
  ];
  
  if (role !== 'intern') {
    environments.push({ label: 'Production', value: 'production' });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-[440px] bg-[#1a1d26] border border-border-krypta rounded-[8px] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border-krypta flex items-center justify-between">
          <span className="text-[14px] font-semibold text-text-primary">Add Secret</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Environment Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Environment
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as EnvironmentType)}
              className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent-purple"
            >
              {environments.map((env) => (
                <option key={env.value} value={env.value}>
                  {env.label}
                </option>
              ))}
            </select>
          </div>

          {/* Key Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Secret Key
            </label>
            <input
              type="text"
              placeholder="e.g. DATABASE_URL"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary font-mono placeholder:font-sans placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
            />
          </div>

          {/* Value Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Secret Value
            </label>
            <textarea
              placeholder="Enter plaintext secret value"
              value={secretValue}
              onChange={(e) => setSecretValue(e.target.value)}
              rows={3}
              className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary font-mono placeholder:font-sans placeholder:text-text-muted focus:outline-none focus:border-accent-purple resize-none"
            />
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
                <span>Add Secret</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
