'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderGit2, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col z-20">
      <Link href="/" className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <FolderGit2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">CodeShelf</span>
      </Link>

      <nav className="flex-1 px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                  isActive ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <Link
          href="/import"
          className="mt-5 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Import Project
        </Link>
      </nav>
    </aside>
  );
}