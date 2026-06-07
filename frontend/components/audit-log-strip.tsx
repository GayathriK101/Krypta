// Bottom horizontal strip showing the 5 most recent audit events — visible to all workspace members.
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { getRecentAuditLogs } from '../lib/api';
import { AuditLog } from '../types';

interface AuditLogStripProps {
  workspaceId: string;
}

export default function AuditLogStrip({ workspaceId }: AuditLogStripProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Simple relative time formatter
  const formatRelativeTime = (dateStr: string) => {
    try {
      const past = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
      const now = new Date();
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 10) return 'just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      return `${diffDay}d ago`;
    } catch {
      return '';
    }
  };

  // Fetch the 5 most recent audit log entries — /recent is accessible to all members, no 403
  const fetchRecentLogs = async () => {
    try {
      const logsData = await getRecentAuditLogs(workspaceId);
      setLogs(logsData);
    } catch (err) {
      // Silently fail — the strip is non-critical UI
      console.error('Failed to load recent audit logs for strip:', err);
    }
  };

  useEffect(() => {
    fetchRecentLogs();

    // Auto-refresh every 30 seconds to keep the live feed current
    const interval = setInterval(fetchRecentLogs, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  return (
    <div className="h-[40px] px-6 bg-bg-sidebar border-t border-border-krypta flex items-center justify-between text-[11px] font-medium select-none z-10 w-full">
      {/* Event list */}
      <div className="flex-1 overflow-hidden flex items-center gap-6">
        <span className="text-text-muted font-mono uppercase tracking-wider text-[10px] flex items-center gap-1.5 shrink-0">
          <RefreshCw className="w-3 h-3 animate-spin shrink-0" style={{ animationDuration: '4s' }} />
          <span>Live Feed</span>
        </span>

        <div className="flex-1 overflow-hidden relative h-[18px]">
          <div className="absolute inset-0 flex flex-col transition-transform duration-500">
            {logs.length > 0 ? (
              <div className="truncate flex items-center gap-2">
                {logs.map((log, idx) => {
                  const a = log.action.toUpperCase();
                  const isBlocked = a === 'BLOCKED_ACCESS' || a === 'BLOCKED';
                  const isWrite = a === 'SECRET_CREATE' || a === 'SECRET_UPDATE' || a === 'CREATE' || a === 'UPDATE';

                  let textClasses = 'text-[#f1f1f1]';
                  if (isBlocked) textClasses = 'text-[#d85a30]';
                  else if (isWrite) textClasses = 'text-[#1d9e75]';

                  return (
                    <React.Fragment key={log.id}>
                      {idx > 0 && <span className="text-[#555] px-1">•</span>}
                      <span className={`inline-flex items-center gap-1 font-mono font-semibold ${textClasses}`}>
                        {isBlocked && <ShieldAlert className="w-3 h-3 shrink-0" />}
                        {log.action}
                      </span>
                      <span className="text-[#555] font-mono">{log.target_key}</span>
                      <span className="text-[#555] font-light">{formatRelativeTime(log.timestamp)}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <span className="text-text-muted italic">No recent activities.</span>
            )}
          </div>
        </div>
      </div>

      {/* Link to full audit log */}
      <Link
        href={`/dashboard/workspace/${workspaceId}/audit`}
        className="text-accent-purple hover:text-[#9089e5] hover:underline transition-colors shrink-0 ml-4"
      >
        View full audit log →
      </Link>
    </div>
  );
}
