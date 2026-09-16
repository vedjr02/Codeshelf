'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderGit2,
  FolderKanban,
  Settings,
  Plus,
  Search,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Loader2,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import type { SessionUser } from '@/lib/session';

export type { SessionUser } from '@/lib/session';

export interface SidebarProps {
  user: SessionUser | null;
  authResolved?: boolean;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  onNavigate?: () => void;
}

const navSections = [
  {
    label: 'Library',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/projects', label: 'Projects', icon: FolderGit2 },
      { href: '/backups', label: 'Backups', icon: Archive },
    ],
  },
  {
    label: 'Organize',
    items: [
      { href: '/collections', label: 'Collections', icon: FolderKanban },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface DashboardTicker {
  totalProjects: number;
  projectsNeedingBackup: number;
}

export function Sidebar({ user, authResolved, onLogout, isLoggingOut, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [ticker, setTicker] = useState<DashboardTicker | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTicker(d))
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase();

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-black/70 backdrop-blur-2xl saturate-150 border-r border-white/[0.08] flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="flex items-center gap-3 group" onClick={onNavigate}>
          <div className="relative">
            <div className="w-11 h-11 rounded-[14px] bg-white/[0.08] border border-white/10 flex items-center justify-center group-hover:bg-white/[0.12] transition-colors duration-200">
              <FolderGit2 className="w-5 h-5 text-[#2997ff]" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#30d158] border-2 border-black" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[17px] font-semibold tracking-tight">CodeShelf</span>
            <span className="text-[12px] text-[#86868b] mt-0.5">Project Library</span>
          </div>
        </Link>
      </div>

      {/* Search — opens the ⌘K command palette */}
      <div className="px-4 mb-5">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('codeshelf:open-palette'))}
          className="relative group w-full text-left"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] group-hover:text-[#2997ff] transition-colors" />
            <div className="h-11 pl-10 pr-12 rounded-[12px] bg-white/[0.06] border border-white/[0.1] flex items-center text-[14px] text-white/35 group-hover:bg-white/[0.09] group-hover:border-white/[0.16] transition-colors">
              Search projects
            </div>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#86868b] border border-white/10 rounded-md px-1.5 py-0.5 font-sans hidden sm:block">
              ⌘K
            </kbd>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] text-[14px] font-medium transition-all duration-200 relative',
                      isActive
                        ? 'text-white bg-white/[0.08]'
                        : 'text-[#86868b] hover:text-white hover:bg-white/[0.05]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] relative transition-colors',
                        isActive ? 'text-[#2997ff]' : 'text-[#86868b] group-hover:text-white'
                      )}
                    />
                    <span className="relative">{item.label}</span>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[#2997ff]" />
                    )}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-white/40 ml-auto relative" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Import CTA */}
        <div className="pt-1">
          <Link
            href="/import"
            onClick={onNavigate}
            className="group flex items-center gap-2.5 px-3.5 py-3 rounded-[12px] text-[14px] font-semibold text-white bg-[#0a84ff] hover:bg-[#2997ff] transition-colors shadow-[0_2px_16px_-2px_rgba(10,132,255,0.4)]"
          >
            <Plus className="w-4 h-4" />
            Import Project
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 pb-6 pt-4 border-t border-white/[0.08]">
        {/* Backup health — real data, links to /backups */}
        {ticker && (
          <Link
            href="/backups"
            onClick={onNavigate}
            className="block rounded-[14px] bg-white/[0.04] border border-white/[0.08] p-3.5 mb-3 hover:bg-white/[0.06] hover:border-white/[0.14] transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-[10px] bg-[#30d158]/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#30d158]" />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13px] font-semibold text-white/80">
                  {ticker.projectsNeedingBackup === 0 ? 'Library Protected' : `${ticker.projectsNeedingBackup} need backup`}
                </span>
                <span className="text-[11px] text-[#86868b] group-hover:text-white/50 transition-colors">
                  {ticker.totalProjects} {ticker.totalProjects === 1 ? 'project' : 'projects'} · view backups
                </span>
              </div>
            </div>
            {ticker.projectsNeedingBackup > 0 && (
              <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#ff9f0a] transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (ticker.projectsNeedingBackup / Math.max(1, ticker.totalProjects)) * 100)}%`,
                  }}
                />
              </div>
            )}
          </Link>
        )}

        {/* User block */}
        <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.08] p-3 flex items-center gap-3">
          {authResolved && user ? (
            <>
              <div className="w-9 h-9 rounded-full bg-[#2997ff]/15 border border-[#2997ff]/25 flex items-center justify-center text-[12.5px] font-semibold text-[#2997ff] shrink-0">
                {initials || '?'}
              </div>
              <div className="flex-1 min-w-0 leading-tight">
                <p className="text-[13px] font-medium truncate">{user.name || user.email.split('@')[0]}</p>
                <p className="text-[11px] text-[#86868b] truncate">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                disabled={isLoggingOut}
                title="Sign out"
                className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white/40 hover:text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors shrink-0 disabled:opacity-50"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse-soft shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-white/[0.08]" />
                <div className="h-2 w-28 rounded bg-white/[0.05]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
