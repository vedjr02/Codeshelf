'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/sidebar';
import type { SessionUser } from '@/lib/session';
import { useToast } from '@/components/ui/toast';
import { Menu, LogOut, Loader2, FolderGit2 } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { success } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setUser(d?.user ?? null);
        setAuthResolved(true);
      })
      .catch(() => !cancelled && setAuthResolved(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      success('Signed out', 'See you soon.');
      window.location.href = '/login';
    } catch {
      setIsLoggingOut(false);
    }
  }, [success]);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar — fixed, inside the shell's padded gutter */}
      <div className="hidden md:block pl-72">
        <Sidebar user={user} authResolved={authResolved} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[280px] animate-slide-in-right">
            <Sidebar user={user} authResolved={authResolved} onLogout={handleLogout} isLoggingOut={isLoggingOut} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="md:pl-0">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-40 md:hidden flex items-center gap-3 h-14 px-4 bg-black/75 backdrop-blur-xl border-b border-white/[0.06]">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-white/[0.08] border border-white/10 flex items-center justify-center">
              <FolderGit2 className="w-3.5 h-3.5 text-[#2997ff]" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">CodeShelf</span>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
