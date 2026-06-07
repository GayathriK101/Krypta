// Fixed sidebar: loads workspaces the current user belongs to, shows sub-nav with Secrets/Audit/Members per workspace.
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, LogOut, Key, ScrollText, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { getWorkspaces } from '../lib/api';
import { Workspace } from '../types';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { email, role, clearAuth } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all workspaces the authenticated user is a member of
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('krypta_token') : null;
    if (!token) return;

    getWorkspaces()
      .then((data) => setWorkspaces(data))
      .catch((err) => console.error('Sidebar: failed to load workspaces', err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  // Extract the active workspace id from the current URL path
  const workspaceIdMatch = pathname?.match(/\/dashboard\/workspace\/([^\/]+)/);
  const activeWorkspaceId = workspaceIdMatch ? workspaceIdMatch[1] : null;

  // Role badge styling
  let badgeClasses = 'bg-[#1a1d26] text-[#888] border border-[#2a2d35]';
  if (role === 'admin') badgeClasses = 'bg-[#1e1b3a] text-[#7f77dd] border border-[#2a2d35]';
  else if (role === 'developer') badgeClasses = 'bg-[#0a1f18] text-[#1d9e75] border border-[#2a2d35]';

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#0a0c10] border-r border-[#2a2d35] flex flex-col z-30 select-none">

      {/* Brand header */}
      <div
        className="h-[56px] px-5 border-b border-[#2a2d35] flex items-center gap-2 cursor-pointer shrink-0"
        onClick={() => router.push('/dashboard')}
      >
        <Lock className="w-4 h-4 text-[#7f77dd]" />
        <span className="text-[15px] font-semibold text-[#7f77dd] tracking-tight">Krypta</span>
      </div>

      {/* Scrollable workspace list */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <div className="text-[10px] font-mono uppercase text-[#555] px-3 mb-2 tracking-wider">
          Workspaces
        </div>

        {loading ? (
          <div className="px-3 py-2 text-[12px] text-[#555] italic">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-[#555] italic leading-5">
            No workspaces found.
          </div>
        ) : (
          <div className="space-y-0.5">
            {workspaces.map((ws) => {
              const isActive = activeWorkspaceId === ws.id;
              const secretsPath = `/dashboard/workspace/${ws.id}`;
              const auditPath = `/dashboard/workspace/${ws.id}/audit`;
              const membersPath = `/dashboard/workspace/${ws.id}/members`;

              return (
                <div key={ws.id}>
                  {/* Workspace name button */}
                  <button
                    onClick={() => router.push(secretsPath)}
                    className={`w-full text-left px-3 py-2 rounded-[6px] text-[13px] font-medium flex items-center justify-between transition-colors ${
                      isActive
                        ? 'text-[#f1f1f1] bg-[#1a1d26]'
                        : 'text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1d26]'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {isActive ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#555] shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#555] shrink-0" />
                    )}
                  </button>

                  {/* Sub-navigation shown only when this workspace is active */}
                  {isActive && (
                    <div className="ml-4 mt-0.5 mb-1 border-l border-[#2a2d35] space-y-0.5">

                      {/* Secrets link */}
                      <button
                        onClick={() => router.push(secretsPath)}
                        className={`w-full text-left pl-3 pr-2 py-1.5 text-[12px] flex items-center gap-2 transition-all ${
                          pathname === secretsPath
                            ? 'border-l-2 border-[#7f77dd] text-[#f1f1f1] bg-[#1a1d26] font-medium'
                            : 'border-l-2 border-transparent text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1d26]'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5 shrink-0" />
                        <span>Secrets</span>
                      </button>

                      {/* Audit Log — admin only */}
                      {role === 'admin' && (
                        <button
                          onClick={() => router.push(auditPath)}
                          className={`w-full text-left pl-3 pr-2 py-1.5 text-[12px] flex items-center gap-2 transition-all ${
                            pathname === auditPath
                              ? 'border-l-2 border-[#7f77dd] text-[#f1f1f1] bg-[#1a1d26] font-medium'
                              : 'border-l-2 border-transparent text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1d26]'
                          }`}
                        >
                          <ScrollText className="w-3.5 h-3.5 shrink-0" />
                          <span>Audit Log</span>
                        </button>
                      )}

                      {/* Members — admin only */}
                      {role === 'admin' && (
                        <button
                          onClick={() => router.push(membersPath)}
                          className={`w-full text-left pl-3 pr-2 py-1.5 text-[12px] flex items-center gap-2 transition-all ${
                            pathname === membersPath
                              ? 'border-l-2 border-[#7f77dd] text-[#f1f1f1] bg-[#1a1d26] font-medium'
                              : 'border-l-2 border-transparent text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1d26]'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>Members</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom profile + logout */}
      <div className="p-4 border-t border-[#2a2d35] bg-[#0a0c10] space-y-3 shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div
            className="text-[12px] font-medium text-[#f1f1f1] truncate"
            title={email || ''}
          >
            {email}
          </div>
          <div className="flex">
            <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono uppercase tracking-wider font-semibold ${badgeClasses}`}>
              {role}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-1.5 px-3 rounded-[6px] bg-[#1a1d26] border border-[#2a2d35] hover:bg-[#20242f] text-[#f1f1f1] text-[12px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
