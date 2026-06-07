// Dashboard home view rendering all user workspaces with real-time metadata counts.
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Plus, FolderPlus, Loader2, X, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getWorkspaces, createWorkspace, getSecrets, getMembers } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { Workspace } from '../../types';

// Workspace card wrapper component resolving counts locally
function WorkspaceCard({ workspace, onClick }: { workspace: Workspace; onClick: () => void }) {
  const [secretsCount, setSecretsCount] = useState<number | null>(null);
  const [membersCount, setMembersCount] = useState<number | null>(null);

  useEffect(() => {
    // Retrieve metrics for secrets and members count
    getSecrets(workspace.id)
      .then((data) => setSecretsCount(data.length))
      .catch(() => setSecretsCount(0));

    getMembers(workspace.id)
      .then((data) => setMembersCount(data.length))
      .catch(() => setMembersCount(1));
  }, [workspace.id]);

  return (
    <div
      onClick={onClick}
      className="p-5 bg-[#1a1d26] border border-border-krypta rounded-[8px] hover:bg-bg-hover transition-colors cursor-pointer group flex flex-col justify-between h-[130px]"
    >
      <div>
        <h3 className="text-[15px] font-semibold text-text-primary group-hover:text-accent-purple transition-colors truncate">
          {workspace.name}
        </h3>
        <div className="flex items-center gap-4 mt-2 text-[12px] text-text-muted">
          <span>
            {secretsCount !== null ? `${secretsCount} secret${secretsCount === 1 ? '' : 's'}` : 'Loading...'}
          </span>
          <span className="text-border-krypta">•</span>
          <span>
            {membersCount !== null ? `${membersCount} member${membersCount === 1 ? '' : 's'}` : 'Loading...'}
          </span>
        </div>
      </div>
      <div className="flex justify-end">
        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-purple group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { role } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    setCreateLoading(true);
    try {
      const newWs = await createWorkspace(name.trim());
      toast.success('Workspace created');
      setName('');
      setShowModal(false);
      fetchWorkspaces();
      // Auto navigate to the newly created workspace
      router.push(`/dashboard/workspace/${newWs.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create workspace';
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="p-8 flex-1 flex flex-col min-h-screen">
      {/* Top Header section */}
      <div className="flex items-center justify-between pb-6 border-b border-border-krypta mb-8">
        <div>
          <h1 className="text-[20px] font-bold text-text-primary tracking-tight">Workspaces</h1>
          <p className="text-[12px] text-text-muted mt-1">Select or create an isolated environment to store secrets</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent-purple hover:bg-[#6b62ce] text-white px-4 py-2 text-[13px] font-medium rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Main Grid display */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted font-mono text-[13px]">
          <Loader2 className="w-5 h-5 animate-spin text-accent-purple mr-2" />
          <span>Loading workspaces...</span>
        </div>
      ) : workspaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {workspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onClick={() => router.push(`/dashboard/workspace/${ws.id}`)}
            />
          ))}
        </div>
      ) : role === 'admin' ? (
        // Admin with no workspaces: invite them to create one
        <div className="flex-1 border border-dashed border-[#2a2d35] rounded-[8px] flex flex-col items-center justify-center p-12 text-center max-w-4xl">
          <FolderPlus className="w-10 h-10 text-[#555] mb-4" />
          <h3 className="text-[14px] font-semibold text-[#f1f1f1]">No workspaces yet</h3>
          <p className="text-[12px] text-[#555] mt-1 max-w-[280px]">
            Create your first workspace to start securing and managing environment credentials.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-[#1a1d26] border border-[#2a2d35] hover:bg-[#20242f] text-[#f1f1f1] text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
          >
            Create Workspace
          </button>
        </div>
      ) : (
        // Developer or intern not yet added to any workspace
        <div className="flex-1 border border-dashed border-[#2a2d35] rounded-[8px] flex flex-col items-center justify-center p-12 text-center max-w-4xl">
          <Lock className="w-10 h-10 text-[#555] mb-4" />
          <h3 className="text-[14px] font-semibold text-[#f1f1f1]">No workspace access</h3>
          <p className="text-[12px] text-[#555] mt-2 max-w-[300px] leading-5">
            You have not been added to any workspace yet. Contact your admin to get access.
          </p>
        </div>
      )}

      {/* Workspace Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-[380px] bg-[#1a1d26] border border-border-krypta rounded-[8px] overflow-hidden">
            <div className="px-5 py-4 border-b border-border-krypta flex items-center justify-between">
              <span className="text-[14px] font-semibold text-text-primary">Create Workspace</span>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Prod"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent-purple"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border-krypta">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={createLoading}
                  className="px-4 py-2 bg-bg-hover hover:bg-[#20242f] text-text-primary border border-border-krypta text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-accent-purple hover:bg-[#6b62ce] text-white text-[13px] font-medium rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
