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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const navSections = [
  {
    label: 'Library',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/projects', label: 'Projects', icon: FolderGit2 },
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [ticker, setTicker] = useState<DashboardTicker | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTicker(d))
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/projects?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-950/60 backdrop-blur-2xl border-r border-white/[0.06] flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform duration-200">
              <FolderGit2 className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight leading-none">CodeShelf</span>
            <span className="text-[11px] text-white/40 leading-none mt-1.5">Project Library</span>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <form onSubmit={handleSearch}>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35 group-focus-within:text-violet-400 transition-colors" />
            <Input
              type="text"
              placeholder="Search projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-[13px] rounded-xl bg-white/[0.045] border-white/[0.08] focus:ring-violet-500/30 hover:bg-white/[0.07] transition-colors"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/25 border border-white/10 rounded-md px-1.5 py-0.5 pointer-events-none font-sans hidden sm:block">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 relative',
                      isActive
                        ? 'text-white'
                        : 'text-white/55 hover:text-white hover:bg-white/[0.05]'
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-transparent ring-1 ring-inset ring-white/10 transition-all duration-300" />
                    )}
                    <Icon
                      className={cn(
                        'w-4 h-4 relative transition-all duration-200',
                        isActive ? 'text-violet-300' : 'text-white/40 group-hover:text-white/70'
                      )}
                    />
                    <span className="relative">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-violet-300/60 ml-auto relative" />
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
            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-gradient-to-r from-violet-600/80 via-fuchsia-600/70 to-violet-600/80 bg-[length:200%_100%] bg-left hover:bg-right transition-[background-position] duration-500 shadow-lg shadow-violet-900/30 hover:shadow-violet-700/30"
          >
            <Plus className="w-4 h-4" />
            Import Project
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 pt-4 border-t border-white/[0.06]">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] font-semibold text-white/80">Local Protection</span>
              <span className="text-[10px] text-white/40 font-mono">v1.0.0</span>
            </div>
          </div>
          {ticker && (
            <div className="flex items-center justify-between text-[10px] text-white/40">
              <span>{ticker.totalProjects} projects</span>
              {ticker.projectsNeedingBackup > 0 && (
                <span className="text-amber-400/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-soft" />
                  {ticker.projectsNeedingBackup} need backup
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}