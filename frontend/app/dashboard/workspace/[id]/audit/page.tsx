// Full audit log viewer page displaying workspace actions and admin-only controls.
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Download, Search, Filter, Loader2, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { getWorkspaces, getAuditLogs, getMembers } from '../../../../../lib/api';
import { useAuthStore } from '../../../../../lib/store';
import { Workspace, AuditLog, WorkspaceMember } from '../../../../../types';

import AuditLogTable from '../../../../../components/audit-log-table';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AuditLogPage({ params }: PageProps) {
  const router = useRouter();
  const { id: workspaceId } = use(params);
  const { role } = useAuthStore();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    // Role guard: Admin only
    if (role && role !== 'admin') {
      toast.error('Access denied: admins only');
      router.push('/dashboard');
      return;
    }

    const init = async () => {
      setLoading(true);
      try {
        const [workspaces, membersData, logsData] = await Promise.all([
          getWorkspaces(),
          getMembers(workspaceId),
          getAuditLogs(workspaceId)
        ]);

        const ws = workspaces.find((w) => w.id === workspaceId);
        if (!ws) {
          toast.error('Workspace not found');
          router.push('/dashboard');
          return;
        }

        setWorkspace(ws);
        setMembers(membersData);
        
        // Map user email to log objects
        const enrichedLogs = logsData.map((log) => {
          const member = membersData.find((m) => m.user_id === log.user_id);
          return {
            ...log,
            user_email: log.user_email || member?.user_email || 'system'
          };
        });
        setLogs(enrichedLogs);

      } catch (err) {
        console.error(err);
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [workspaceId, role]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User Email', 'Action', 'Secret Key', 'Environment', 'Status'];
    const rows = filteredLogs.map((log) => {
      const isBlocked = log.action === 'BLOCKED_ACCESS' || log.action === 'BLOCKED';
      const key = log.target_key.toUpperCase();
      const action = log.action.toUpperCase();
      
      let env = 'development';
      if (key.includes('PROD') || action.includes('PRODUCTION')) env = 'production';
      else if (key.includes('TEST') || action.includes('TESTING')) env = 'testing';

      return [
        new Date(log.timestamp).toISOString(),
        log.user_email || 'system',
        log.action,
        log.target_key,
        env,
        isBlocked ? 'denied' : 'allowed',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `krypta_audit_log_${workspaceId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logs in real-time
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.user_email && log.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.target_key && log.target_key.toLowerCase().includes(searchQuery.toLowerCase()));

    if (actionFilter === 'ALL') return matchesSearch;
    
    const action = log.action.toUpperCase();
    if (actionFilter === 'VIEW') return matchesSearch && (action.includes('VIEW') || action.includes('READ'));
    if (actionFilter === 'CREATE') return matchesSearch && (action.includes('CREATE') || action.includes('ADD'));
    if (actionFilter === 'BLOCKED') return matchesSearch && (action.includes('BLOCKED') || action.includes('DENIED'));
    if (actionFilter === 'ROLLBACK') return matchesSearch && action.includes('ROLLBACK');

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted font-mono text-[13px] select-none">
        <Loader2 className="w-5 h-5 animate-spin text-accent-purple mr-2" />
        <span>Loading audit logs...</span>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="p-8 flex-1 flex flex-col min-h-screen select-none">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-border-krypta mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-text-primary tracking-tight">Audit Log</h1>
          <p className="text-[12px] text-text-muted mt-1">Workspace: {workspace.name}</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="bg-[#1a1d26] border border-border-krypta hover:bg-[#20242f] disabled:opacity-50 text-text-primary px-4 py-2 text-[13px] font-medium rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Useful tip badge */}
      <div className="bg-[#1a1d26] border-l-2 border-accent-purple p-3.5 rounded-r-[6px] text-[13px] text-text-muted italic mb-6">
        "Search an employee's email to see every secret they accessed — useful for security offboarding"
      </div>

      {/* Search and Filters bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by user or secret key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-sidebar border border-border-krypta rounded-[6px] pl-9 pr-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
          />
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-text-muted shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full sm:w-auto bg-bg-sidebar border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary font-mono focus:outline-none focus:border-accent-purple"
          >
            <option value="ALL">ALL EVENTS</option>
            <option value="VIEW">VIEW ACTIONS</option>
            <option value="CREATE">CREATE ACTIONS</option>
            <option value="BLOCKED">BLOCKED ACTIONS</option>
            <option value="ROLLBACK">ROLLBACKS</option>
          </select>
        </div>
      </div>

      {/* Logs Table Area */}
      <div className="flex-1">
        {logs.length === 0 ? (
          <div className="border border-dashed border-border-krypta rounded-[8px] py-16 text-center flex flex-col items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-text-muted mb-3" />
            <h3 className="text-[13px] font-semibold text-text-primary">No audit events yet</h3>
            <p className="text-[12px] text-text-muted mt-1 max-w-[280px]">
              Actions taken on workspace secrets will appear here in chronological order.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="border border-dashed border-border-krypta rounded-[8px] py-16 text-center flex flex-col items-center justify-center">
            <Search className="w-8 h-8 text-text-muted mb-3" />
            <h3 className="text-[13px] font-semibold text-text-primary">No events match your search</h3>
            <p className="text-[12px] text-text-muted mt-1 max-w-[280px]">
              Refine your queries or change filters to find matching records.
            </p>
          </div>
        ) : (
          <AuditLogTable logs={filteredLogs} />
        )}
      </div>

    </div>
  );
}
