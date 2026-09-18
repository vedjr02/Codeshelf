'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Archive,
  ArrowRight,
  CornerDownLeft,
  FolderClosed,
  FolderOpen,
  Gauge,
  Hash,
  Library,
  Plus,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Code2,
  ShieldPlus,
} from 'lucide-react';
import { cn, getLanguageColor, prettyPath } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { ScoreChip } from '@/components/score';
import type { HealthGrade } from '@/lib/health';

const OPEN_EVENT = 'codeshelf:open-palette';
const RECENTS_KEY = 'codeshelf:recent-projects';

/** Opens the palette from anywhere without prop-drilling a setter. */
export function openPalette(initialQuery?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: initialQuery }));
}

interface ProjectHit {
  id: string;
  name: string;
  path: string;
  language?: string | null;
  framework?: string | null;
  gitStatus?: string | null;
  score: number;
  grade: HealthGrade;
  lastBackupAt?: string | null;
}

interface SearchResponse {
  projects: ProjectHit[];
  collections: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
  smartCollections: Array<{ id: string; name: string; count: number }>;
}

type Entry =
  | { kind: 'project'; id: string; project: ProjectHit }
  | { kind: 'link'; id: string; label: string; sublabel?: string; href: string; icon: React.ReactNode };

const NAV_ACTIONS: Array<{ id: string; label: string; href: string; icon: React.ReactNode; keywords: string }> = [
  { id: 'nav-overview', label: 'Overview', href: '/', icon: <Gauge className="h-4 w-4" />, keywords: 'dashboard home score health' },
  { id: 'nav-projects', label: 'All Projects', href: '/projects', icon: <Library className="h-4 w-4" />, keywords: 'library list browse' },
  { id: 'nav-import', label: 'Import Projects', href: '/import', icon: <Plus className="h-4 w-4" />, keywords: 'scan add folder discover new' },
  { id: 'nav-backups', label: 'Backups', href: '/backups', icon: <Archive className="h-4 w-4" />, keywords: 'snapshot restore archive zip timeline' },
  { id: 'nav-collections', label: 'Collections & Tags', href: '/collections', icon: <FolderClosed className="h-4 w-4" />, keywords: 'organize smart rules groups labels' },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" />, keywords: 'preferences appearance backup path storage' },
];

const SCOPE_HINTS = [
  { token: 'lang:', example: 'lang:typescript', description: 'by language' },
  { token: 'is:dirty', example: 'is:dirty', description: 'uncommitted work' },
  { token: 'is:unprotected', example: 'is:unprotected', description: 'never backed up' },
  { token: 'tag:', example: 'tag:client', description: 'by tag' },
];

function readRecents(): ProjectHit[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function rememberRecent(project: ProjectHit) {
  try {
    const next = [project, ...readRecents().filter((p) => p.id !== project.id)].slice(0, 5);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Recents are a convenience; losing them is not an error.
  }
}

export function CommandPalette() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResponse | null>(null);
  const [recents, setRecents] = React.useState<ProjectHit[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  /* ---- Open / close ------------------------------------------------- */
  React.useEffect(() => {
    const reset = (initial = '') => {
      setQuery(initial);
      setResults(null);
      setActiveIndex(0);
      setRecents(readRecents());
      setOpen(true);
    };

    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((wasOpen) => {
          if (wasOpen) return false;
          reset();
          return true;
        });
      }
    };
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<string | undefined>).detail;
      reset(typeof detail === 'string' ? detail : '');
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  /* ---- Search ------------------------------------------------------- */
  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as SearchResponse;
        setResults(data);
      } catch {
        // Aborted by the next keystroke, or offline — keep what we had.
      }
    }, query ? 160 : 0);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  /* ---- Flatten to a single keyboard list ----------------------------- */
  const { entries, sections } = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const list: Entry[] = [];
    const marks: Array<{ index: number; label: string }> = [];

    const push = (label: string, items: Entry[]) => {
      if (items.length === 0) return;
      marks.push({ index: list.length, label });
      list.push(...items);
    };

    const projectHits = results?.projects ?? [];
    if (trimmed) {
      push(
        'Projects',
        projectHits.map((project) => ({ kind: 'project' as const, id: `p-${project.id}`, project }))
      );
    } else if (recents.length > 0) {
      push(
        'Recent',
        recents.map((project) => ({ kind: 'project' as const, id: `r-${project.id}`, project }))
      );
    } else {
      push(
        'Projects',
        projectHits.slice(0, 5).map((project) => ({ kind: 'project' as const, id: `p-${project.id}`, project }))
      );
    }

    push(
      'Smart Collections',
      (results?.smartCollections ?? []).map((smart) => ({
        kind: 'link' as const,
        id: `s-${smart.id}`,
        label: smart.name,
        sublabel: `${smart.count} matching`,
        href: `/projects?smart=${smart.id}`,
        icon: <Sparkles className="h-4 w-4 text-violet" />,
      }))
    );

    push(
      'Collections',
      (results?.collections ?? []).map((collection) => ({
        kind: 'link' as const,
        id: `c-${collection.id}`,
        label: collection.name,
        href: `/projects?collectionId=${collection.id}`,
        icon: <FolderClosed className="h-4 w-4 text-accent-ink" />,
      }))
    );

    push(
      'Tags',
      (results?.tags ?? []).map((tag) => ({
        kind: 'link' as const,
        id: `t-${tag.id}`,
        label: tag.name,
        href: `/projects?tagId=${tag.id}`,
        icon: <Hash className="h-4 w-4" style={{ color: tag.color }} />,
      }))
    );

    const actions = trimmed
      ? NAV_ACTIONS.filter(
          (action) =>
            action.label.toLowerCase().includes(trimmed) || action.keywords.includes(trimmed)
        )
      : NAV_ACTIONS;
    push(
      'Go to',
      actions.map((action) => ({
        kind: 'link' as const,
        id: action.id,
        label: action.label,
        href: action.href,
        icon: <span className="text-ink-3">{action.icon}</span>,
      }))
    );

    if (trimmed) {
      push('Search', [
        {
          kind: 'link' as const,
          id: 'search-all',
          label: `Search the library for “${query.trim()}”`,
          href: `/projects?search=${encodeURIComponent(query.trim())}`,
          icon: <Search className="h-4 w-4 text-ink-3" />,
        },
      ]);
    }

    return { entries: list, sections: marks };
  }, [results, recents, query]);

  const selected = Math.min(activeIndex, Math.max(0, entries.length - 1));
  const selectedEntry = entries[selected];

  React.useEffect(() => {
    listRef.current?.querySelector(`[data-index="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  /* ---- Acting on a row ---------------------------------------------- */
  const go = React.useCallback(
    (entry: Entry) => {
      setOpen(false);
      if (entry.kind === 'project') {
        rememberRecent(entry.project);
        router.push(`/projects/${entry.project.id}`);
      } else {
        router.push(entry.href);
      }
    },
    [router]
  );

  const runProjectAction = React.useCallback(
    async (project: ProjectHit, action: 'finder' | 'editor' | 'terminal' | 'backup') => {
      setBusy(true);
      try {
        if (action === 'backup') {
          const res = await fetch('/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: project.id }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Backup failed');
          success('Snapshot created', project.name);
        } else {
          const res = await fetch(`/api/projects/${project.id}/open`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Could not open that');
          success(`Opened in ${data.handler}`, project.name);
        }
        setOpen(false);
      } catch (err) {
        toastError('That did not work', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [success, toastError]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (entries.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % entries.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + entries.length) % entries.length);
      return;
    }
    if (event.key !== 'Enter' || !selectedEntry) return;

    event.preventDefault();

    if (selectedEntry.kind === 'project') {
      if (event.metaKey || event.ctrlKey) {
        void runProjectAction(selectedEntry.project, 'finder');
        return;
      }
      if (event.altKey) {
        void runProjectAction(selectedEntry.project, 'editor');
        return;
      }
      if (event.shiftKey) {
        void runProjectAction(selectedEntry.project, 'backup');
        return;
      }
    }
    go(selectedEntry);
  };

  const sectionAt = (index: number) => sections.find((s) => s.index === index)?.label;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        onKeyDown={onKeyDown}
        className="top-[12vh] max-w-[580px] translate-y-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Search CodeShelf</DialogTitle>

        <div className="flex h-[54px] items-center gap-3 border-b-[0.5px] border-line px-4">
          <Search className="h-[17px] w-[17px] shrink-0 text-ink-4" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search projects, or type a filter…"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink-4 focus:outline-none"
            aria-label="Search"
          />
          {busy && <span className="shrink-0 text-[12.5px] text-ink-4">Working…</span>}
        </div>

        <div ref={listRef} className="max-h-[54vh] overflow-y-auto p-1.5">
          {entries.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-[15px] text-ink-2">No matches for “{query.trim()}”</p>
              <p className="mt-1.5 text-[13.5px] text-ink-4">Try a name, a language, or a filter like is:dirty.</p>
            </div>
          ) : (
            entries.map((entry, index) => {
              const label = sectionAt(index);
              const isSelected = index === selected;
              return (
                <React.Fragment key={entry.id}>
                  {label && (
                    <div className="px-2.5 pb-1 pt-2.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                      {label}
                    </div>
                  )}
                  <button
                    type="button"
                    data-index={index}
                    onClick={() => go(entry)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-left',
                      'transition-colors duration-100',
                      isSelected ? 'bg-accent text-on-accent' : 'text-ink hover:bg-surface-3'
                    )}
                  >
                    {entry.kind === 'project' ? (
                      <>
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                          style={{
                            backgroundColor: isSelected
                              ? 'rgba(255,255,255,0.18)'
                              : `color-mix(in srgb, ${getLanguageColor(entry.project.language)} 16%, transparent)`,
                          }}
                        >
                          <FolderOpen
                            className="h-[15px] w-[15px]"
                            style={{ color: isSelected ? 'currentColor' : getLanguageColor(entry.project.language) }}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">{entry.project.name}</span>
                          <span
                            className={cn(
                              'mono block truncate text-[12.5px]',
                              isSelected ? 'text-on-accent/70' : 'text-ink-4'
                            )}
                          >
                            {prettyPath(entry.project.path)}
                          </span>
                        </span>
                        {!isSelected && <ScoreChip score={entry.project.score} grade={entry.project.grade} />}
                        {isSelected && (
                          <span className="flex shrink-0 items-center gap-1 text-[12px] text-on-accent/80">
                            <CornerDownLeft className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center">{entry.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px]">{entry.label}</span>
                          {entry.sublabel && (
                            <span
                              className={cn(
                                'block truncate text-[12.5px]',
                                isSelected ? 'text-on-accent/70' : 'text-ink-4'
                              )}
                            >
                              {entry.sublabel}
                            </span>
                          )}
                        </span>
                        {isSelected && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-on-accent/80" />}
                      </>
                    )}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer teaches the shortcuts that make the palette worth using. */}
        <div className="flex items-center gap-3 border-t-[0.5px] border-line px-3.5 py-2 text-[12.5px] text-ink-4">
          {selectedEntry?.kind === 'project' ? (
            <>
              <Shortcut keys="⏎" label="Open" />
              <Shortcut keys="⌘⏎" label="Reveal" icon={<FolderOpen className="h-3 w-3" />} />
              <Shortcut keys="⌥⏎" label="Editor" icon={<Code2 className="h-3 w-3" />} />
              <Shortcut keys="⇧⏎" label="Back up" icon={<ShieldPlus className="h-3 w-3" />} />
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Terminal className="h-3 w-3" />
                Filters:
              </span>
              {SCOPE_HINTS.map((hint) => (
                <button
                  key={hint.token}
                  type="button"
                  onClick={() => setQuery(hint.example)}
                  className="mono rounded-[5px] bg-surface-3 px-1.5 py-0.5 text-[12px] text-ink-3 transition-colors hover:text-ink"
                  title={hint.description}
                >
                  {hint.example}
                </button>
              ))}
            </div>
          )}
          <span className="ml-auto shrink-0">esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Shortcut({ keys, label, icon }: { keys: string; label: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="rounded-[5px] border-[0.5px] border-line bg-surface-3 px-1.5 py-0.5 text-[12px] text-ink-3">
        {keys}
      </kbd>
      <span className="inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
    </span>
  );
}
