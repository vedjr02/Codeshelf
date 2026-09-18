'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Archive,
  ChevronRight,
  FolderClosed,
  Gauge,
  Hash,
  HardDrive,
  Library,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLibrary } from '@/components/library-context';
import { ScoreChip } from '@/components/score';
import { openPalette } from '@/components/command-palette';

export interface SidebarProps {
  onLogout?: () => void;
  onNavigate?: () => void;
}

const PRIMARY = [
  { href: '/', label: 'Overview', icon: Gauge, exact: true },
  { href: '/projects', label: 'All Projects', icon: Library },
  { href: '/backups', label: 'Backups', icon: Archive },
  { href: '/storage', label: 'Storage', icon: HardDrive },
];

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-4">
      <span className="text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-4">{children}</span>
      {action}
    </div>
  );
}

function Row({
  href,
  icon: Icon,
  label,
  active,
  trailing,
  onNavigate,
  iconColor,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  trailing?: React.ReactNode;
  onNavigate?: () => void;
  iconColor?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex h-[34px] items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5',
        'text-[14.5px] transition-colors duration-150',
        active
          ? 'bg-accent-tint font-medium text-accent-ink'
          : 'text-ink-2 hover:bg-surface-3 hover:text-ink'
      )}
    >
      <Icon
        className="h-[15px] w-[15px] shrink-0"
        style={iconColor && !active ? { color: iconColor } : undefined}
      />
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </Link>
  );
}

function Count({ value }: { value: number }) {
  return <span className="shrink-0 text-[12.5px] tabular text-ink-4">{value}</span>;
}

export function Sidebar({ onLogout, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, authResolved, collections, tags, smartCollections, libraryScore, libraryGrade, totalProjects } =
    useLibrary();

  const activeCollection = searchParams.get('collectionId');
  const activeTag = searchParams.get('tagId');
  const activeSmart = searchParams.get('smart');
  const onProjects = pathname === '/projects';
  const plainProjects = onProjects && !activeCollection && !activeTag && !activeSmart;

  const initials =
    user?.name
      ?.split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || user?.email?.[0]?.toUpperCase();

  return (
    <aside className="material flex h-full w-[264px] flex-col border-r-[0.5px] border-line">
      {/* Identity */}
      <div className="flex h-[52px] shrink-0 items-center gap-2.5 px-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-[var(--radius-sm)] py-1 pr-2"
        >
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-accent">
            <Library className="h-[13px] w-[13px] text-on-accent" />
          </span>
          <span className="text-[15.5px] font-semibold tracking-[-0.015em] text-ink">CodeShelf</span>
        </Link>
      </div>

      {/* Search opens the palette — the field is a button on purpose, so
          there is exactly one search surface in the app. */}
      <div className="px-3 pb-1">
        <button
          type="button"
          onClick={() => openPalette()}
          className={cn(
            'group flex h-8 w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5',
            'border-[0.5px] border-line bg-surface-3/60 text-[14px] text-ink-4',
            'transition-colors duration-150 hover:border-line-2 hover:text-ink-3'
          )}
        >
          <Search className="h-[14px] w-[14px]" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="text-[12px] text-ink-5">⌘K</kbd>
        </button>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-0.5 pt-2">
          {PRIMARY.map((item) => (
            <Row
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              onNavigate={onNavigate}
              active={
                item.exact
                  ? pathname === item.href
                  : item.href === '/projects'
                    ? plainProjects
                    : pathname.startsWith(item.href)
              }
              trailing={item.href === '/projects' && totalProjects > 0 ? <Count value={totalProjects} /> : undefined}
            />
          ))}
        </div>

        {/* Smart collections — rules, so the membership stays true. */}
        <SectionLabel
          action={
            <Link
              href="/collections?new=smart"
              onClick={onNavigate}
              title="New Smart Collection"
              className="rounded-[5px] p-0.5 text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <Plus className="h-[13px] w-[13px]" />
            </Link>
          }
        >
          Smart
        </SectionLabel>
        {smartCollections.length === 0 ? (
          <Link
            href="/collections?new=smart"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13.5px] text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink-2"
          >
            <Wand2 className="h-[14px] w-[14px]" />
            Create your first rule
          </Link>
        ) : (
          <div className="space-y-0.5">
            {smartCollections.map((smart) => (
              <Row
                key={smart.id}
                href={`/projects?smart=${smart.id}`}
                icon={Sparkles}
                label={smart.name}
                onNavigate={onNavigate}
                active={activeSmart === smart.id}
                trailing={<Count value={smart.projectCount} />}
              />
            ))}
          </div>
        )}

        {/* Hand-made collections */}
        <SectionLabel
          action={
            <Link
              href="/collections?new=collection"
              onClick={onNavigate}
              title="New collection"
              className="rounded-[5px] p-0.5 text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <Plus className="h-[13px] w-[13px]" />
            </Link>
          }
        >
          Collections
        </SectionLabel>
        {collections.length === 0 ? (
          <Link
            href="/collections?new=collection"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13.5px] text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink-2"
          >
            <FolderClosed className="h-[14px] w-[14px]" />
            Group related projects
          </Link>
        ) : (
          <div className="space-y-0.5">
            {collections.slice(0, 8).map((collection) => (
              <Row
                key={collection.id}
                href={`/projects?collectionId=${collection.id}`}
                icon={FolderClosed}
                label={collection.name}
                onNavigate={onNavigate}
                active={activeCollection === collection.id}
                trailing={<Count value={collection.projectCount} />}
              />
            ))}
            {collections.length > 8 && (
              <Link
                href="/collections"
                onClick={onNavigate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13.5px] text-ink-4 hover:text-ink-2"
              >
                {collections.length - 8} more
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <>
            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-1.5 px-2 pt-1">
              {tags.slice(0, 12).map((tag) => (
                <Link
                  key={tag.id}
                  href={`/projects?tagId=${tag.id}`}
                  onClick={onNavigate}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[12.5px] transition-colors',
                    activeTag === tag.id
                      ? 'bg-accent text-on-accent'
                      : 'bg-surface-3 text-ink-2 hover:text-ink'
                  )}
                >
                  <Hash className="h-[11px] w-[11px] opacity-60" />
                  {tag.name}
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer: score, import, account */}
      <div className="shrink-0 space-y-2 border-t-[0.5px] border-line px-3 py-3">
        {libraryScore !== null && libraryGrade && totalProjects > 0 && (
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 transition-colors hover:bg-surface-3"
          >
            <span className="text-[13.5px] text-ink-3">Shelf Score</span>
            <ScoreChip score={libraryScore} grade={libraryGrade} />
          </Link>
        )}

        <Link
          href="/import"
          onClick={onNavigate}
          className={cn(
            'flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)]',
            'bg-accent text-[14.5px] font-medium text-on-accent',
            'transition-colors duration-150 hover:bg-accent-hover'
          )}
        >
          <Plus className="h-4 w-4" />
          Import Projects
        </Link>

        <div className="flex items-center gap-2 pt-1">
          {authResolved && user ? (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink-2">
                {initials || '?'}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13.5px] font-medium text-ink">
                  {user.name || user.email.split('@')[0]}
                </span>
                <span className="block truncate text-[12px] text-ink-4">{user.email}</span>
              </span>
              <Link
                href="/settings"
                onClick={onNavigate}
                title="Settings"
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors',
                  pathname.startsWith('/settings')
                    ? 'bg-accent-tint text-accent-ink'
                    : 'text-ink-4 hover:bg-surface-3 hover:text-ink'
                )}
              >
                <Settings className="h-[15px] w-[15px]" />
              </Link>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-4 transition-colors hover:bg-bad-tint hover:text-bad"
              >
                <LogOut className="h-[15px] w-[15px]" />
              </button>
            </>
          ) : (
            <div className="h-7 w-7 animate-breathe rounded-full bg-surface-3" />
          )}
        </div>
      </div>
    </aside>
  );
}

/** Shown while the navigation resolves the current query string. */
export function SidebarFallback() {
  return (
    <aside className="material flex h-full w-[264px] flex-col border-r-[0.5px] border-line">
      <div className="flex h-[52px] shrink-0 items-center gap-2.5 px-4">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-accent">
          <Library className="h-[13px] w-[13px] text-on-accent" />
        </span>
        <span className="text-[15.5px] font-semibold tracking-[-0.015em] text-ink">CodeShelf</span>
      </div>
      <div className="flex-1 space-y-1.5 px-3 pt-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton h-[30px] rounded-[var(--radius-sm)]" />
        ))}
      </div>
    </aside>
  );
}
