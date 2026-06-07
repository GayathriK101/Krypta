// Dashboard layout providing layout structure and authentication page guards.
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/sidebar';
import { useAuthStore } from '../../lib/store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Strict redirect check if no token exists in either Zustand store or localStorage
    const savedToken = localStorage.getItem('krypta_token');
    if (!token && !savedToken) {
      router.push('/login');
    }
  }, [token, router]);

  const hasToken = token || (typeof window !== 'undefined' && localStorage.getItem('krypta_token'));

  if (!mounted || !hasToken) {
    return (
      <div className="flex-1 bg-bg-main min-h-screen flex items-center justify-center font-mono text-text-muted text-[13px] select-none">
        <span>Decrypting session<span className="animate-blink">_</span></span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-main text-text-primary">
      {/* Fixed Sidebar navigation */}
      <Sidebar />

      {/* Main viewport panels */}
      <main className="flex-1 pl-[220px] flex flex-col min-h-screen relative">
        {children}
      </main>
    </div>
  );
}
