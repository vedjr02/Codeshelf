'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/sidebar';
import { CommandPalette } from '@/components/command-palette';
import type { SessionUser } from '@/lib/session';
import { useToast } from '@/components/ui/toast';
import { Menu, FolderGit2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { success } = useToast();

  // Restore sidebar collapse preference
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (localStorage.getItem('codeshelf:sidebar-collapsed') === '1') {
        setCollapsed(true);
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('codeshelf:sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  }, []);

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
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      success('Signed out', 'See you soon.');
    } finally {
      // Hard navigation is intentional: it clears every client cache and
      // React state after the session is destroyed (router.push would keep
      // prefetched authenticated pages alive).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/login');
    }
  }, [success]);

  return (
    <div className="min-h-screen">
      <CommandPalette />
      {/* Desktop sidebar — fixed; content column carries the matching offset */}
      <div className="hidden md:block">
        <Sidebar
          user={user}
          authResolved={authResolved}
          onLogout={handleLogout}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[280px] animate-slide-in-right" role="dialog" aria-modal="true" aria-label="Main navigation">
            <Sidebar user={user} authResolved={authResolved} onLogout={handleLogout} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column — offset matches the sidebar width (fixes overlap) */}
      <div className={cn('codeshelf-main transition-[padding] duration-200', collapsed ? 'md:pl-[76px]' : 'md:pl-72')}>
        {/* Mobile topbar */}
        <div className="codeshelf-mobile-bar sticky top-0 z-40 md:hidden flex items-center gap-3 h-14 px-4 bg-[#101014]/85 backdrop-blur-xl border-b border-white/[0.08]">
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
          <button
            onClick={() => window.dispatchEvent(new Event('codeshelf:open-palette'))}
            className="ml-auto w-9 h-9 rounded-[10px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Search"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
