// Tab component for switching environment contexts, blocking invalid access with tooltips.
'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { EnvironmentType } from '../types';

interface EnvironmentTabsProps {
  activeTab: EnvironmentType;
  onChange: (tab: EnvironmentType) => void;
}

export default function EnvironmentTabs({ activeTab, onChange }: EnvironmentTabsProps) {
  const { role } = useAuthStore();

  const tabs: { label: string; value: EnvironmentType }[] = [
    { label: 'development', value: 'development' },
    { label: 'testing', value: 'testing' },
    { label: 'production', value: 'production' },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-border-krypta pb-4 select-none">
      {tabs.map((tab) => {
        const isIntern = role === 'intern';
        const isLocked = isIntern && (tab.value === 'testing' || tab.value === 'production');
        const isActive = activeTab === tab.value;

        if (isLocked) {
          return (
            <div key={tab.value} className="group relative">
              <button
                type="button"
                className="px-4 py-2 bg-[#0c0d12] border border-border-krypta/40 text-[#444] text-[13px] font-mono rounded-[6px] cursor-not-allowed flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-[#444]" />
                <span>{tab.label}</span>
              </button>
              
              {/* CSS Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-[#1a1d26] border border-[#2a2d35] text-[11px] text-[#888] px-3 py-1.5 rounded-[4px] shadow-none pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 font-sans">
                Interns can only access development
              </div>
            </div>
          );
        }

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`px-4 py-2 text-[13px] font-mono rounded-[6px] transition-colors border cursor-pointer ${
              isActive
                ? 'bg-accent-purple border-accent-purple text-white font-semibold'
                : 'bg-bg-hover border-border-krypta text-text-muted hover:text-text-primary hover:bg-[#20242f]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
