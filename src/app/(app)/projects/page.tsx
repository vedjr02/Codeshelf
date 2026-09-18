'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Plus, Search, Sparkles, Star, X } from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconInput } from '@/components/ui/input';
import { Segmented } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ProjectCard } from '@/components/project-card';
import { ProjectRow, ProjectRowHeader } from '@/components/project-row';
import { QuickLook } from '@/components/quick-look';
import { useProjectActions } from '@/components/project-actions';
import { useLibrary } from '@/components/library-context';
import { plural, cn } from '@/lib/utils';
import type { ProjectSummary } from '@/types/client';

type ViewMode = 'grid' | 'list';

/**
 * Sort options are stored as `key:order` pairs so the control always has an
 * exact match for its current value — a Select whose value is not in its list
 * renders blank.
 */
const SORTS = [
  { value: 'lastModified:desc', label: 'Last modified' },
  { value: 'lastOpened:desc', label: 'Last opened' },
  { value: 'name:asc', label: 'Name' },
  { value: 'size:desc', label: 'Largest first' },
  { value: 'size:asc', label: 'Smallest first' },
  { value: 'health:asc', label: 'Shelf Score (worst first)' },
  { value: 'health:desc', label: 'Shelf Score (best first)' },
];

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Projects">
          <SkeletonRows rows={6} />
        </PageShell>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { collections, tags, smartCollections } = useLibrary();

  const collectionId = params.get('collectionId') ?? '';
  const tagId = params.get('tagId') ?? '';
  const smartId = params.get('smart') ?? '';
  const languageParam = params.get('language') ?? '';

  const [projects, setProjects] = React.useState<ProjectSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [search, setSearch] = React.useState(params.get('search') ?? '');
  const [language, setLanguage] = React.useState(languageParam || 'all');
  const [sortBy, setSortBy] = React.useState(params.get('sortBy') ?? 'lastModified');
  const [sortOrder, setSortOrder] = React.useState(params.get('sortOrder') === 'asc' ? 'asc' : 'desc');
  const [onlyFavourites, setOnlyFavourites] = React.useState(params.get('isFavorite') === 'true');
  const [showArchived, setShowArchived] = React.useState(params.get('isArchived') === 'true');

  const [view, setView] = React.useState<ViewMode>('grid');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [peeked, setPeeked] = React.useState<ProjectSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectSummary | null>(null);

  /* ---- View preference ---------------------------------------------- */
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem('codeshelf:projects-view');
        if (stored === 'grid' || stored === 'list') setView(stored);
      } catch {
        // Falls back to grid.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem('codeshelf:projects-view', next);
    } catch {
      // Preference is best-effort.
    }
  };

  /* ---- Load --------------------------------------------------------- */
  React.useEffect(() => {
    const signal = { cancelled: false };
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams();
        if (search.trim()) query.set('search', search.trim());
        if (language !== 'all') query.set('language', language);
        query.set('sortBy', sortBy);
        query.set('sortOrder', sortOrder);
        if (onlyFavourites) query.set('isFavorite', 'true');
        if (showArchived) query.set('isArchived', 'true');
        if (collectionId) query.set('collectionId', collectionId);
        if (tagId) query.set('tagId', tagId);
        if (smartId) query.set('smart', smartId);

        const res = await fetch(`/api/projects?${query.toString()}`);
        if (!res.ok) throw new Error('Could not load your projects');
        const data = (await res.json()) as ProjectSummary[];
        if (signal.cancelled) return;
        setProjects(data);
        setError(null);
      } catch (err) {
        if (!signal.cancelled) setError(err instanceof Error ? err.message : 'Could not load your projects');
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    }, search ? 220 : 0);

    return () => {
      signal.cancelled = true;
      clearTimeout(timer);
    };
  }, [search, language, sortBy, sortOrder, onlyFavourites, showArchived, collectionId, tagId, smartId, reloadKey]);

  const actions = useProjectActions({
    onPatched: (id, patch) =>
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    onRemoved: (id) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setPeeked((current) => (current?.id === id ? null : current));
    },
    onRefreshed: () => setReloadKey((n) => n + 1),
  });

  /* ---- Keyboard navigation over the list ----------------------------- */
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (peeked) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (projects.length === 0) return;

      const index = projects.findIndex((p) => p.id === selectedId);

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next =
          event.key === 'ArrowDown'
            ? Math.min(projects.length - 1, index + 1)
            : Math.max(0, index <= 0 ? 0 : index - 1);
        setSelectedId(projects[next].id);
      } else if (event.key === ' ' && index >= 0) {
        event.preventDefault();
        setPeeked(projects[index]);
      } else if (event.key === 'Enter' && index >= 0) {
        router.push(`/projects/${projects[index].id}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [projects, selectedId, peeked, router]);

  // Fall back to the default pair when a URL asks for a combination the
  // control does not offer.
  const sortValue = SORTS.some((sort) => sort.value === `${sortBy}:${sortOrder}`)
    ? `${sortBy}:${sortOrder}`
    : 'lastModified:desc';

  const languages = React.useMemo(
    () => Array.from(new Set(projects.map((p) => p.language).filter(Boolean) as string[])).sort(),
    [projects]
  );

  /* ---- Context: which view of the library is this? ------------------- */
  const activeSmart = smartCollections.find((s) => s.id === smartId);
  const activeCollection = collections.find((c) => c.id === collectionId);
  const activeTag = tags.find((t) => t.id === tagId);

  const title = activeSmart?.name ?? activeCollection?.name ?? (activeTag ? `#${activeTag.name}` : 'All Projects');
  const subtitle = activeSmart
    ? activeSmart.description
    : activeCollection?.description ||
      (showArchived
        ? 'Projects you have put away. Nothing here is deleted.'
        : `${plural(projects.length, 'project')} in this view`);

  const clearContext = () => router.push('/projects');
  const hasContext = Boolean(smartId || collectionId || tagId);
  const hasFilters = Boolean(search.trim()) || language !== 'all' || onlyFavourites;

  return (
    <>
      <PageShell
        title={title}
        eyebrow={activeSmart ? 'Smart Collection' : activeCollection ? 'Collection' : activeTag ? 'Tag' : undefined}
        subtitle={subtitle}
        width="wide"
        actions={
          <>
            {hasContext && (
              <Button variant="ghost" size="pill" onClick={clearContext}>
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
            <Button asChild variant="primary" size="pill">
              <Link href="/import">
                <Plus className="h-4 w-4" />
                Import
              </Link>
            </Button>
          </>
        }
      >
        {/* ---- Filter bar ---------------------------------------------- */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="min-w-[200px] flex-1">
            <IconInput
              icon={<Search />}
              type="search"
              placeholder="Filter this view…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Filter projects"
            />
          </div>

          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[152px]" aria-label="Language">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortValue}
            onValueChange={(value) => {
              const [key, order] = value.split(':');
              setSortBy(key);
              setSortOrder(order);
            }}
          >
            <SelectTrigger className="w-[196px]" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((sort) => (
                <SelectItem key={sort.value} value={sort.value}>
                  {sort.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={onlyFavourites ? 'primary' : 'secondary'}
            size="md"
            aria-pressed={onlyFavourites}
            onClick={() => setOnlyFavourites((value) => !value)}
          >
            <Star className={cn('h-4 w-4', onlyFavourites && 'fill-current')} />
            <span className="hidden sm:inline">Favourites</span>
          </Button>

          <Segmented
            aria-label="View"
            value={view}
            onChange={changeView}
            options={[
              { value: 'grid', label: <LayoutGrid className="h-[15px] w-[15px]" />, title: 'Grid' },
              { value: 'list', label: <List className="h-[15px] w-[15px]" />, title: 'List' },
            ]}
          />
        </div>

        {/* Archived is a mode, not a filter chip — it shows a different set. */}
        <div className="mb-5 flex items-center gap-3 text-[14px]">
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            className="text-ink-3 underline-offset-[3px] transition-colors hover:text-ink hover:underline"
          >
            {showArchived ? 'Back to the library' : 'Show archived projects'}
          </button>
          {activeSmart && (
            <Button asChild variant="link" size="xs" className="ml-auto px-0">
              <Link href="/collections?new=smart">
                <Sparkles className="h-3.5 w-3.5" />
                Edit rules
              </Link>
            </Button>
          )}
        </div>

        {/* ---- Results ------------------------------------------------- */}
        {loading ? (
          <SkeletonRows rows={6} />
        ) : error ? (
          <Card className="p-4">
            <ErrorState message={error} retry={() => setReloadKey((n) => n + 1)} />
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <EmptyState
              title={hasFilters || hasContext ? 'Nothing matches' : 'Your shelf is empty'}
              description={
                hasFilters || hasContext
                  ? 'Loosen a filter, or clear this view to see the whole library.'
                  : 'Scan a folder and CodeShelf will find the projects inside it.'
              }
              action={
                hasFilters || hasContext ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setLanguage('all');
                      setOnlyFavourites(false);
                      if (hasContext) clearContext();
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button asChild variant="primary" size="sm">
                    <Link href="/import">
                      <Plus className="h-4 w-4" />
                      Import projects
                    </Link>
                  </Button>
                )
              }
            />
          </Card>
        ) : view === 'grid' ? (
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                actions={actions}
                onRequestDelete={setDeleteTarget}
                selected={selectedId === project.id}
                onSelect={(p) => setSelectedId(p.id)}
                onPeek={setPeeked}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden" elevation="flat">
            <ProjectRowHeader
              sortBy={sortBy}
              onSort={(key) => {
                if (key === sortBy) {
                  setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'));
                } else {
                  setSortBy(key);
                  setSortOrder(key === 'name' ? 'asc' : 'desc');
                }
              }}
            />
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                actions={actions}
                onRequestDelete={setDeleteTarget}
                selected={selectedId === project.id}
                onSelect={(p) => setSelectedId(p.id)}
                onPeek={setPeeked}
              />
            ))}
          </Card>
        )}

        {projects.length > 0 && (
          <p className="mt-5 text-center text-[13.5px] text-ink-4">
            {plural(projects.length, 'project')} · select one and press{' '}
            <kbd className="rounded-[5px] border-[0.5px] border-line bg-surface-3 px-1.5 py-0.5 text-[12px]">
              space
            </kbd>{' '}
            to peek
          </p>
        )}
      </PageShell>

      <QuickLook project={peeked} onClose={() => setPeeked(null)} actions={actions} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Remove “${deleteTarget.name}” from CodeShelf?` : 'Remove project?'}
        description="This removes it from your library only."
        detail="The folder and every file inside it stay exactly where they are on disk. Snapshots you already took are also kept."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (deleteTarget) await actions.remove(deleteTarget);
        }}
      />
    </>
  );
}
