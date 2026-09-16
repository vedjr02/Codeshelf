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
    <aside className="fixed left-0 top-0 h-screen w-72 bg-black/70 backdrop-blur-2xl saturate-150 border-r border-white/[0.08] flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="flex items-center gap-3 group">
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

      {/* Search */}
      <div className="px-4 mb-5">
        <form onSubmit={handleSearch}>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] group-focus-within:text-[#2997ff] transition-colors" />
            <Input
              type="text"
              placeholder="Search projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-[14px] rounded-[12px] bg-white/[0.06] border-white/[0.1] focus:ring-[#2997ff]/30 hover:bg-white/[0.09] transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#86868b] border border-white/10 rounded-md px-1.5 py-0.5 pointer-events-none font-sans hidden sm:block">
              ⌘K
            </kbd>
          </div>
        </form>
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
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
        <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.08] p-3.5">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[#30d158]/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#30d158]" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-white/80">Library Protected</span>
              <span className="text-[11px] text-[#86868b] font-mono">v1.0.0</span>
            </div>
          </div>
          {ticker && (
            <div className="flex items-center justify-between text-[11px] text-[#86868b]">
              <span>{ticker.totalProjects} projects</span>
              {ticker.projectsNeedingBackup > 0 && (
                <span className="text-[#ff9f0a] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a] animate-pulse-soft" />
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