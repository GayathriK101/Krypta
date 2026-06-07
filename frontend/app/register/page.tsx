// Registration screen facilitating user creation and matching credentials validation.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { register } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password);
      toast.success('Account created! Please sign in');
      router.push('/login');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-bg-main min-h-screen px-4 select-none">
      <div className="w-full max-w-[400px] bg-[#1a1d26] border border-border-krypta rounded-[8px] p-6 space-y-6">
        
        {/* Top branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-2.5 rounded-[8px] bg-bg-main border border-border-krypta">
              <Lock className="w-6 h-6 text-accent-purple" />
            </div>
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">Krypta</h1>
          <p className="text-[12px] text-text-muted">Create your secure account</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Email Address
            </label>
            <input
              type="email"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-main border border-border-krypta rounded-[6px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-text-muted tracking-wider block">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                <span>Registering...</span>
              </>
            ) : (
              <span>Register</span>
            )}
          </button>
        </form>

        {/* Link Footer */}
        <div className="text-center text-[12px]">
          <span className="text-text-muted">Already have an account? </span>
          <Link href="/login" className="text-accent-purple hover:text-[#9089e5] hover:underline transition-colors font-medium">
            Sign in →
          </Link>
        </div>

      </div>
    </div>
  );
}
