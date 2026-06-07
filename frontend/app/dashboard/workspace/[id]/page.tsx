// Secrets dashboard view displaying environment tabs, secrets listing, and recent audit logs feed.
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Key, Loader2, Eye, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { getWorkspaces, getSecrets, getMembers } from '../../../../lib/api';
import { useAuthStore } from '../../../../lib/store';
import { Workspace, Secret, WorkspaceMember, EnvironmentType } from '../../../../types';

import EnvironmentTabs from '../../../../components/environment-tabs';
import SecretRow from '../../../../components/secret-row';
import AddSecretModal from '../../../../components/add-secret-modal';
import AuditLogStrip from '../../../../components/audit-log-strip';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkspaceSecretsPage({ params }: PageProps) {
  const router = useRouter();
  const { id: workspaceId } = use(params);
  const { role } = useAuthStore();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activeTab, setActiveTab] = useState<EnvironmentType>('development');

  const [loading, setLoading] = useState(true);
  const [secretsLoading, setSecretsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load workspace, members list (for resolving emails), and secrets
  const loadWorkspaceData = async () => {
    try {
      const workspaces = await getWorkspaces();
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) {
        toast.error('Workspace not found');
        router.push('/dashboard');
        return;
      }
      setWorkspace(ws);

      const membersData = await getMembers(workspaceId);
      setMembers(membersData);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching workspace details');
    }
  };

  const loadSecretsData = async (env: EnvironmentType) => {
    setSecretsLoading(true);
    try {
      const data = await getSecrets(workspaceId, env);
      setSecrets(data);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Failed to fetch secrets';
      toast.error(msg);
    } finally {
      setSecretsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadWorkspaceData();
      await loadSecretsData(activeTab);
      setLoading(false);
    };
    init();
  }, [workspaceId]);

  const handleTabChange = async (tab: EnvironmentType) => {
    setActiveTab(tab);
    await loadSecretsData(tab);
  };

  const getMemberEmail = (userId: string | null) => {
    if (!userId) return 'system';
    const member = members.find((m) => m.user_id === userId);
    return member?.user_email || userId;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted font-mono text-[13px] select-none">
        <Loader2 className="w-5 h-5 animate-spin text-accent-purple mr-2" />
        <span>Decrypting workspace...</span>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-[40px] relative select-none">
      {/* Scrollable content container */}
      <div className="p-8 flex-1 overflow-y-auto">
        
        {/* Workspace Top Header Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-border-krypta mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-text-primary tracking-tight">{workspace.name}</h1>
              <span className="px-2 py-0.5 rounded-[4px] bg-bg-hover text-text-muted font-mono text-[11px] font-medium border border-border-krypta">
                {secrets.length} secret{secrets.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[12px] text-text-muted mt-1">Manage and inject environment secrets and configurations</p>
          </div>
          
          {role !== 'intern' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-accent-purple hover:bg-[#6b62ce] text-white px-4 py-2 text-[13px] font-medium rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Secret</span>
            </button>
          )}
        </div>

        {/* Tab Selection Row */}
        <EnvironmentTabs activeTab={activeTab} onChange={handleTabChange} />

        {/* Secrets Table Display */}
        <div className="mt-6">
          {secretsLoading ? (
            <div className="py-12 flex items-center justify-center text-text-muted font-mono text-[13px]">
              <Loader2 className="w-4 h-4 animate-spin text-accent-purple mr-2" />
              <span>Decrypting secrets...</span>
            </div>
          ) : secrets.length > 0 ? (
            <div className="w-full border border-border-krypta rounded-[8px] overflow-hidden bg-bg-sidebar">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border-krypta bg-bg-main text-[10px] uppercase text-text-muted font-mono tracking-wider">
                    <th className="px-4 py-3 font-semibold">Key</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                    <th className="px-4 py-3 font-semibold">Version</th>
                    <th className="px-4 py-3 font-semibold">Updated By</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-krypta">
                  {secrets.map((secret) => (
                    <SecretRow
                      key={secret.id}
                      secret={secret}
                      updaterEmail={getMemberEmail(secret.updated_by)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-border-krypta rounded-[8px] py-16 text-center flex flex-col items-center justify-center">
              <Key className="w-8 h-8 text-text-muted mb-3" />
              <h3 className="text-[13px] font-semibold text-text-primary">No secrets found</h3>
              <p className="text-[12px] text-text-muted mt-1 max-w-[280px]">
                No secrets stored in the <span className="font-mono text-text-primary">{activeTab}</span> environment.
              </p>
              {role !== 'intern' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-3 py-1.5 bg-[#1a1d26] border border-border-krypta hover:bg-[#20242f] text-text-primary text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer"
                >
                  Create Secret
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Persistent Bottom Audit strip */}
      <AuditLogStrip workspaceId={workspaceId} />

      {/* Secret Creation Overlay Modal */}
      {showAddModal && (
        <AddSecretModal
          workspaceId={workspaceId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => loadSecretsData(activeTab)}
        />
      )}
    </div>
  );
}
