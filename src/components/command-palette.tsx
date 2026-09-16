'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Search,
  LayoutDashboard,
  FolderGit2,
  Archive,
  FolderKanban,
  Plus,
  Settings,
  CornerDownLeft,
  FileCode,
} from 'lucide-react';
import { getLanguageColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ReactNode;
  keywords?: string;
}

interface SearchProject {
  id: string;
  name: string;
  path: string;
  language?: string | null;
  framework?: string | null;
}

const QUICK_ACTIONS: PaletteItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', href: '/', icon: <LayoutDashboard className="w-4 h-4 text-[#2997ff]" />, keywords: 'home overview stats' },
  { id: 'nav-projects', label: 'All Projects', href: '/projects', icon: <FolderGit2 className="w-4 h-4 text-[#2997ff]" />, keywords: 'library list' },
  { id: 'nav-import', label: 'Import Project', href: '/import', icon: <Plus className="w-4 h-4 text-[#30d158]" />, keywords: 'add scan new folder' },
  { id: 'nav-backups', label: 'Backups', href: '/backups', icon: <Archive className="w-4 h-4 text-[#30d158]" />, keywords: 'restore snapshot archive' },
  { id: 'nav-collections', label: 'Collections & Tags', href: '/collections', icon: <FolderKanban className="w-4 h-4 text-[#ff9f0a]" />, keywords: 'organize groups labels' },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: <Settings className="w-4 h-4 text-[#86868b]" />, keywords: 'preferences config backup path' },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [projects, setProjects] = React.useState<SearchProject[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Global hotkey + custom open event
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            // Reset state when opening (event context — lint-safe)
            setQuery('');
            setProjects([]);
            setSearching(false);
            setActiveIndex(0);
          }
          return !prev;
        });
      }
    };
    const onOpenEvent = () => {
      setQuery('');
      setProjects([]);
      setSearching(false);
      setActiveIndex(0);
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('codeshelf:open-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('codeshelf:open-palette', onOpenEvent);
    };
  }, []);


  // Debounced search
  React.useEffect(() => {
    if (!open || !query.trim()) {
      return;
    }
    const id = requestAnimationFrame(() => setSearching(true));
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch {
        // aborted or failed — leave previous results
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => {
      cancelAnimationFrame(id);
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  // Build flat item list: project results first, then filtered actions
  const items = React.useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const projectItems: PaletteItem[] = projects.map((p) => ({
      id: `project-${p.id}`,
      label: p.name,
      sublabel: p.path,
      href: `/projects/${p.id}`,
      icon: (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: getLanguageColor(p.language) }}
        />
      ),
    }));

    const filteredActions = q
      ? QUICK_ACTIONS.filter(
          (a) =>
            a.label.toLowerCase().includes(q) ||
            (a.keywords || '').toLowerCase().includes(q)
        )
      : QUICK_ACTIONS;

    const searchInLibrary: PaletteItem[] = q
      ? [
          {
            id: 'search-library',
            label: `Search projects for "${query.trim()}"`,
            href: `/projects?search=${encodeURIComponent(query.trim())}`,
            icon: <FileCode className="w-4 h-4 text-white/50" />,
          },
        ]
      : [];

    return [...projectItems, ...filteredActions, ...searchInLibrary];
  }, [projects, query]);

  // Selection clamped to the current item count
  const selected = Math.min(activeIndex, Math.max(0, items.length - 1));

  React.useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const selectItem = (item: PaletteItem) => {
    setOpen(false);
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[selected];
      if (item) selectItem(item);
    }
  };

  const showActions = !query.trim() || items.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[14%] translate-y-0 max-w-[560px] bg-[#161618]/95 backdrop-blur-2xl border-white/[0.14] rounded-[18px] p-0 gap-0 overflow-hidden"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>

        {/* Input */}
        <div className="flex items-center gap-3 px-5 h-[60px] border-b border-white/[0.08]">
          <Search className="w-[18px] h-[18px] text-[#86868b] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search projects or jump to…"
            className="flex-1 bg-transparent text-[16px] text-white placeholder:text-white/30 focus:outline-none"
          />
          {searching && <span className="text-[11px] text-white/30 shrink-0">Searching…</span>}
          <kbd className="text-[11px] text-white/35 border border-white/12 rounded-md px-1.5 py-0.5 shrink-0 font-sans">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2">
          {!showActions ? (
            <div className="py-10 text-center">
              <p className="text-[14px] text-white/40">No results for “{query.trim()}”</p>
              <p className="text-[12px] text-white/25 mt-1.5">Try a different name, language, or framework.</p>
            </div>
          ) : (
            <>
              {projects.length > 0 && (
                <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30">
                  Projects
                </div>
              )}
              {items.map((item, index) => (
                <button
                  key={item.id}
                  data-index={index}
                  onClick={() => selectItem(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-3 py-2.5 rounded-[12px] text-left transition-colors duration-100',
                    index === selected ? 'bg-white/[0.08]' : 'bg-transparent'
                  )}
                >
                  <span className="flex items-center justify-center w-5 shrink-0">{item.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-medium text-white truncate">{item.label}</span>
                    {item.sublabel && (
                      <span className="block text-[11.5px] text-white/35 truncate font-mono mt-0.5">{item.sublabel}</span>
                    )}
                  </span>
                  {index === selected && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
