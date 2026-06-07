// Zustand authentication store managing token, email, and role.
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
  setAuth: (token: string, email: string, role: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('krypta_token') : null,
  email: typeof window !== 'undefined' ? localStorage.getItem('krypta_email') : null,
  role: typeof window !== 'undefined' ? localStorage.getItem('krypta_role') : null,
  setAuth: (token, email, role) => {
    localStorage.setItem('krypta_token', token);
    localStorage.setItem('krypta_email', email);
    localStorage.setItem('krypta_role', role);
    set({ token, email, role });
  },
  clearAuth: () => {
    localStorage.removeItem('krypta_token');
    localStorage.removeItem('krypta_email');
    localStorage.removeItem('krypta_role');
    set({ token: null, email: null, role: null });
  },
}));
