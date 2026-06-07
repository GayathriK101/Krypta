// Table component representing workspace audit logs with dynamic action badges and status indicators.
'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export default function AuditLogTable({ logs }: AuditLogTableProps) {
  
  // Format date: "Jun 6, 2026 · 08:45 AM"
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' · ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Infer environment from log data
  const getEnvironment = (log: AuditLog) => {
    const key = log.target_key.toUpperCase();
    const action = log.action.toUpperCase();
    if (key.includes('PROD') || action.includes('PRODUCTION')) {
      return 'production';
    }
    if (key.includes('TEST') || action.includes('TESTING')) {
      return 'testing';
    }
    return 'development';
  };

  // Render a colored badge for each action type emitted by the backend
  const renderActionBadge = (action: string) => {
    const a = action.toUpperCase();

    if (a === 'SECRET_VIEW' || a === 'VIEW') {
      return (
        <span className="px-2 py-0.5 rounded-[4px] bg-[#2a2d35] text-[#888] text-[11px] font-mono">
          SECRET_VIEW
        </span>
      );
    }
    if (a === 'SECRET_CREATE' || a === 'CREATE') {
      return (
        <span className="px-2 py-0.5 rounded-[4px] bg-[#0a1f18] text-[#1d9e75] text-[11px] font-mono">
          SECRET_CREATE
        </span>
      );
    }
    if (a === 'SECRET_UPDATE' || a === 'UPDATE') {
      return (
        <span className="px-2 py-0.5 rounded-[4px] bg-[#2a2210] text-[#d8a030] text-[11px] font-mono">
          SECRET_UPDATE
        </span>
      );
    }
    if (a === 'BLOCKED_ACCESS' || a === 'BLOCKED') {
      return (
        <span className="px-2 py-0.5 rounded-[4px] bg-[#2a1008] text-[#d85a30] text-[11px] font-mono inline-flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          <span>BLOCKED_ACCESS</span>
        </span>
      );
    }
    if (a === 'VERSION_ROLLBACK' || a === 'ROLLBACK') {
      return (
        <span className="px-2 py-0.5 rounded-[4px] bg-[#1e1b3a] text-[#7f77dd] text-[11px] font-mono">
          VERSION_ROLLBACK
        </span>
      );
    }
    // Fallback: render raw action string for any unknown future action types
    return (
      <span className="px-2 py-0.5 rounded-[4px] bg-[#1a1d26] text-[#f1f1f1] text-[11px] font-mono">
        {action}
      </span>
    );
  };

  // Render Environment Badge
  const renderEnvBadge = (env: string) => {
    if (env === 'production') {
      return (
        <span className="px-2 py-0.5 rounded-[4px] bg-[#2a1008] text-danger-coral text-[11px] font-mono">
          production
        </span>
      );
    }
    if (env === 'testing') {
      return (
        <span className="px-2 py-0.5 rounded-[4px] bg-[#2a2210] text-[#d8a030] text-[11px] font-mono">
          testing
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-[4px] bg-bg-hover text-text-muted text-[11px] font-mono">
        development
      </span>
    );
  };

  return (
    <div className="w-full overflow-x-auto border border-border-krypta rounded-[8px] bg-bg-sidebar">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border-krypta bg-bg-main text-[10px] uppercase text-text-muted font-mono tracking-wider">
            <th className="px-4 py-3 font-semibold">Timestamp</th>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Action</th>
            <th className="px-4 py-3 font-semibold">Secret Key</th>
            <th className="px-4 py-3 font-semibold">Environment</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-krypta text-[13px]">
          {logs.map((log) => {
            const isBlocked = log.action === 'BLOCKED_ACCESS' || log.action === 'BLOCKED';
            const env = getEnvironment(log);
            const userEmail = log.user_email || 'system';

            return (
              <tr key={log.id} className="hover:bg-bg-hover transition-colors">
                {/* TIMESTAMP */}
                <td className="px-4 py-3 font-sans text-text-muted whitespace-nowrap">
                  {formatDate(log.timestamp)}
                </td>

                {/* USER */}
                <td className="px-4 py-3 font-mono text-text-primary whitespace-nowrap truncate max-w-[160px]">
                  {userEmail}
                </td>

                {/* ACTION */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderActionBadge(log.action)}
                </td>

                {/* SECRET KEY */}
                <td className="px-4 py-3 font-mono text-text-primary font-medium truncate max-w-[180px]">
                  {log.target_key}
                </td>

                {/* ENVIRONMENT */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderEnvBadge(env)}
                </td>

                {/* STATUS */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {isBlocked ? (
                    <div className="flex items-center gap-1.5 text-danger-coral">
                      <span className="w-2 h-2 rounded-full bg-danger-coral animate-pulse" />
                      <span className="text-[12px] font-medium font-mono uppercase tracking-wide">denied</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-success-green">
                      <span className="w-2 h-2 rounded-full bg-success-green" />
                      <span className="text-[12px] font-medium font-mono uppercase tracking-wide">allowed</span>
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
