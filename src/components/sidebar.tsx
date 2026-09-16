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
  ChevronRight,
  LogOut,
  Loader2,
  Archive,
  PanelLeftClose,
  PanelLeftOpen,
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
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
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

export function Sidebar({
  user,
  authResolved,
  onLogout,
  isLoggingOut,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
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
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-[#15151b]/90 backdrop-blur-2xl saturate-150 border-r border-white/[0.1] flex flex-col z-30 transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-72'
      )}
    >
      {/* Logo */}
      <div className={cn('pt-6 pb-5', collapsed ? 'px-3' : 'px-6')}>
        <div className="flex items-center gap-3">
          <Link href="/" onClick={onNavigate} className="shrink-0" title="Dashboard">
            <div className="w-10 h-10 rounded-[12px] bg-white/[0.08] border border-white/10 flex items-center justify-center hover:bg-white/[0.12] transition-colors">
              <FolderGit2 className="w-5 h-5 text-[#2997ff]" />
            </div>
          </Link>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0 animate-fade">
              <span className="text-[16px] font-semibold tracking-tight truncate">CodeShelf</span>
              <span className="text-[11.5px] text-[#9a9aa3] truncate">Project Library</span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onToggleCollapsed}
              title="Collapse sidebar"
              className="ml-auto w-8 h-8 rounded-[9px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
            >
              <PanelLeftClose className="w-[17px] h-[17px]" />
            </button>
          )}
        </div>
      </div>

      {/* Search / expand button */}
      <div className={cn('mb-4', collapsed ? 'px-3' : 'px-4')}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('codeshelf:open-palette'))}
            title="Search (⌘K)"
            className="w-full h-10 rounded-[11px] bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-[#9a9aa3] hover:bg-white/[0.1] hover:text-white transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('codeshelf:open-palette'))}
            className="relative group w-full text-left"
          >
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9aa3] group-hover:text-[#2997ff] transition-colors" />
              <div className="h-10 pl-10 pr-12 rounded-[11px] bg-white/[0.06] border border-white/[0.1] flex items-center text-[13.5px] text-white/40 group-hover:bg-white/[0.09] group-hover:border-white/[0.16] transition-colors">
                Search projects
              </div>
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] text-[#9a9aa3] border border-white/12 rounded-md px-1.5 py-0.5 font-sans hidden sm:block">
                ⌘K
              </kbd>
            </div>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden no-scrollbar', collapsed ? 'px-3' : 'px-3')}>
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            {!collapsed ? (
              <div className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/35">
                {section.label}
              </div>
            ) : (
              <div className="mx-3 mb-2 hairline" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group flex items-center rounded-[11px] text-[13.5px] font-medium transition-all duration-150 relative',
                      collapsed ? 'justify-center h-10' : 'gap-3 px-3 py-2',
                      isActive
                        ? 'text-white bg-white/[0.1]'
                        : 'text-[#9a9aa3] hover:text-white hover:bg-white/[0.06]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-[17px] h-[17px] shrink-0 transition-colors',
                        isActive ? 'text-[#2997ff]' : 'text-[#9a9aa3] group-hover:text-white'
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full bg-[#2997ff]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Import CTA */}
        <div className="pt-1">
          {collapsed ? (
            <Link
              href="/import"
              onClick={onNavigate}
              title="Import Project"
              className="w-full h-10 rounded-[11px] bg-[#0a84ff] hover:bg-[#2997ff] flex items-center justify-center text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/import"
              onClick={onNavigate}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[13.5px] font-semibold text-white bg-[#0a84ff] hover:bg-[#2997ff] transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Import Project
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className={cn('pb-5 pt-3 border-t border-white/[0.08]', collapsed ? 'px-3' : 'px-4')}>
        {/* Backup health */}
        {ticker && !collapsed && (
          <Link
            href="/backups"
            onClick={onNavigate}
            className="block rounded-[12px] bg-white/[0.05] border border-white/[0.09] p-3 mb-2.5 hover:bg-white/[0.075] hover:border-white/[0.15] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[9px] bg-[#30d158]/12 flex items-center justify-center shrink-0">
                <Archive className="w-3.5 h-3.5 text-[#30d158]" />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[12px] font-medium text-white/85">
                  {ticker.projectsNeedingBackup === 0 ? 'Library protected' : `${ticker.projectsNeedingBackup} need backup`}
                </span>
                <span className="text-[10.5px] text-[#9a9aa3]">
                  {ticker.totalProjects} {ticker.totalProjects === 1 ? 'project' : 'projects'} · view backups
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* User block */}
        <div
          className={cn(
            'rounded-[12px] bg-white/[0.05] border border-white/[0.09] flex items-center',
            collapsed ? 'justify-center p-2' : 'p-2.5 gap-2.5'
          )}
        >
          {authResolved && user ? (
            <>
              <div
                className={cn(
                  'rounded-full bg-[#2997ff]/15 border border-[#2997ff]/25 flex items-center justify-center text-[11px] font-semibold text-[#2997ff] shrink-0',
                  collapsed ? 'w-8 h-8' : 'w-8 h-8'
                )}
                title={collapsed ? user.email : undefined}
              >
                {initials || '?'}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 leading-tight">
                    <p className="text-[12.5px] font-medium truncate">{user.name || user.email.split('@')[0]}</p>
                    <p className="text-[10.5px] text-[#9a9aa3] truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    disabled={isLoggingOut}
                    title="Sign out"
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white/40 hover:text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className={cn('animate-pulse-soft rounded-full bg-white/[0.08]', collapsed ? 'w-8 h-8' : 'w-8 h-8')} />
          )}
        </div>

        {collapsed && (
          <button
            onClick={onToggleCollapsed}
            title="Expand sidebar"
            className="w-full h-9 mt-2 rounded-[11px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <PanelLeftOpen className="w-[17px] h-[17px]" />
          </button>
        )}
      </div>
    </aside>
  );
}
