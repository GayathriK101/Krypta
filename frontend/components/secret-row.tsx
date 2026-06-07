// Secret row with eye-icon reveal that calls /reveal endpoint to trigger SECRET_VIEW audit log.
'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { revealSecret } from '../lib/api';
import { Secret } from '../types';

interface SecretRowProps {
  secret: Secret;
  updaterEmail?: string;
}

export default function SecretRow({ secret, updaterEmail }: SecretRowProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Auto-hide the revealed value after 30 seconds and write the audit log only on reveal
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRevealed) {
      setCountdown(30);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsRevealed(false);
            setRevealedValue(null);
            clearInterval(timer);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRevealed]);

  // Called when the user clicks the eye icon.
  // Calls the /reveal endpoint which writes the SECRET_VIEW audit log on the backend.
  const handleReveal = async () => {
    if (isRevealed) {
      // Toggle off — hide again without an API call
      setIsRevealed(false);
      setRevealedValue(null);
      return;
    }

    setRevealing(true);
    try {
      const data = await revealSecret(secret.workspace_id, secret.id);
      setRevealedValue(data.secret_value);
      setIsRevealed(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to reveal secret';
      toast.error(msg);
    } finally {
      setRevealing(false);
    }
  };

  const handleCopy = () => {
    if (!isRevealed || !revealedValue) {
      toast.error('Reveal secret first');
      return;
    }
    navigator.clipboard.writeText(revealedValue);
    toast.success('Value copied to clipboard');
  };

  return (
    <tr className="hover:bg-[#1a1d26] transition-colors border-b border-[#2a2d35] text-[13px]">

      {/* KEY COLUMN */}
      <td className="px-4 py-3 font-mono font-medium text-[#f1f1f1]">
        {secret.secret_key}
      </td>

      {/* VALUE COLUMN */}
      <td className="px-4 py-3 font-mono">
        <div className="flex items-center gap-2">
          {isRevealed && revealedValue ? (
            <span className="px-2 py-0.5 rounded-[4px] bg-[#0a1f18] text-[#1d9e75] font-medium">
              {revealedValue}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-[4px] bg-[#0f1117] text-[#555] select-none">
              ••••••••••••
            </span>
          )}
          {isRevealed && (
            <span className="text-[11px] text-[#555] font-sans font-medium">
              Hiding in {countdown}s
            </span>
          )}
        </div>
      </td>

      {/* VERSION COLUMN */}
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded-[4px] bg-[#1e1b3a] text-[#7f77dd] font-mono font-semibold text-[11px]">
          v{secret.version}
        </span>
      </td>

      {/* UPDATED BY COLUMN */}
      <td className="px-4 py-3 text-[#555] truncate max-w-[150px] font-mono text-[12px]">
        {updaterEmail || secret.updated_by || 'system'}
      </td>

      {/* ACTIONS COLUMN */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Eye icon — triggers the /reveal API call and SECRET_VIEW audit log */}
          <button
            onClick={handleReveal}
            disabled={revealing}
            className="text-[#555] hover:text-[#f1f1f1] transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
            title={isRevealed ? 'Hide secret' : 'Reveal secret'}
          >
            {revealing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRevealed ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>

          {/* Copy icon — only works after revealing */}
          <button
            onClick={handleCopy}
            className="text-[#555] hover:text-[#f1f1f1] transition-colors focus:outline-none cursor-pointer"
            title="Copy secret value"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
