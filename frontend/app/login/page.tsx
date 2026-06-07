// Login screen facilitating authentication, token persistence, and role resolution.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { login, getWorkspaces, getMembers } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // 1. Call login API
      const authData = await login(email.trim(), password);
      const token = authData.access_token;
      
      // Temporarily store token in localStorage to make subsequent API calls
      localStorage.setItem('krypta_token', token);

      // 2. Fetch workspaces to resolve user's role in their active workspace
      let resolvedRole = 'admin'; // default role for new users
      try {
        const workspaces = await getWorkspaces();
        if (workspaces.length > 0) {
          // Check members of the first workspace to extract the user's role
          const members = await getMembers(workspaces[0].id);
          const self = members.find((m) => m.user_email === email.trim());
          if (self) {
            resolvedRole = self.role;
          }
        }
      } catch (wsErr) {
        console.error('Failed to resolve workspace role on login, using default:', wsErr);
      }

      // 3. Save to Zustand store (which also handles localStorage updates)
      setAuth(token, email.trim(), resolvedRole);
      
      toast.success('Sign in successful');
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-bg-main min-h-screen px-4 select-none">
      <div className="w-full max-w-[400px] bg-[#1a1d26] border border-border-krypta rounded-[8px] p-6 space-y-6">
        
        {/* Top Header branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-2.5 rounded-[8px] bg-bg-main border border-border-krypta">
              <Lock className="w-6 h-6 text-accent-purple" />
            </div>
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">Krypta</h1>
          <p className="text-[12px] text-text-muted">Secure secret management</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Email Address
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent-purple"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-accent-purple hover:bg-[#6b62ce] disabled:bg-[#4d4694] text-white text-[13px] font-medium rounded-[6px] transition-colors flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        {/* Link Footer */}
        <div className="text-center text-[12px]">
          <span className="text-text-muted">Don't have an account? </span>
          <Link href="/register" className="text-accent-purple hover:text-[#9089e5] hover:underline transition-colors font-medium">
            Register →
          </Link>
        </div>

      </div>
    </div>
  );
}
