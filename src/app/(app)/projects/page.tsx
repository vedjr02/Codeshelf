'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProjectCard } from '@/components/project-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Star, Archive, FolderGit2, Layers, X, Hash, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  path: string;
  language?: string | null;
  framework?: string | null;
  size: number;
  lastModified?: string | null;
  lastOpened?: string | null;
  isGitRepo?: boolean;
  gitBranch?: string | null;
  gitRemote?: string | null;
  gitStatus?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  tags?: Array<{ id: string; name: string; color: string }>;
  collections?: Array<{ id: string; name: string }>;
  backups?: Array<{ id: string; createdAt: string }>;
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading projects..." />}>
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCollectionId = searchParams.get('collectionId') || '';
  const initialTagId = searchParams.get('tagId') || '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [language, setLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastModified');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [filterArchived, setFilterArchived] = useState(false);
  const [collectionId, setCollectionId] = useState<string>(initialCollectionId);
  const [tagId, setTagId] = useState<string>(initialTagId);
  const [retryCount, setRetryCount] = useState(0);
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [tagName, setTagName] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { success, error: toastError } = useToast();

  // Debounced fetch: waits for typing to settle before hitting the API
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (language && language !== 'all') params.set('language', language);
        if (sortBy) params.set('sortBy', sortBy);
        if (filterFavorite) params.set('isFavorite', 'true');
        if (filterArchived) params.set('isArchived', 'true');
        if (collectionId) params.set('collectionId', collectionId);
        if (tagId) params.set('tagId', tagId);

        const res = await fetch(`/api/projects?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        if (!cancelled) {
          setProjects(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, language, sortBy, filterFavorite, filterArchived, collectionId, tagId, retryCount]);

  const handleToggleFavorite = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !project.isFavorite }),
      });

      if (!res.ok) throw new Error('Could not update favorite status');
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
    } catch (error) {
      toastError('Could not update favorite', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleArchive = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !project.isArchived }),
      });

      if (!res.ok) throw new Error('Could not update archive status');
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, isArchived: !p.isArchived } : p));
    } catch (error) {
      toastError('Could not update project', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not remove this project');
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      success('Project removed', `${deleteTarget.name} was removed from your library. Files on disk were not changed.`);
      setDeleteTarget(null);
    } catch (error) {
      toastError('Could not remove project', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const languages = Array.from(
    new Set(projects.map((p) => p.language).filter(Boolean) as string[])
  );

  // Resolve collection/tag names for the active filter banner
  useEffect(() => {
    if (!collectionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/collections');
        const cols: Array<{ id: string; name: string }> = res.ok ? await res.json() : [];
        if (!cancelled) setCollectionName(cols.find((c) => c.id === collectionId)?.name || 'Collection');
      } catch {
        if (!cancelled) setCollectionName('Collection');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  useEffect(() => {
    if (!tagId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tags');
        const tags: Array<{ id: string; name: string }> = res.ok ? await res.json() : [];
        if (!cancelled) setTagName(tags.find((t) => t.id === tagId)?.name || 'Tag');
      } catch {
        if (!cancelled) setTagName('Tag');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tagId]);

  const hasActiveContextFilters = Boolean(collectionId || tagId);

  return (
    <>
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 mb-10 animate-rise">
            <div>
              <span className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-white/45 mb-3">
                <Layers className="w-4 h-4" />
                Project Library
              </span>
              <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-none mb-2">
                All Projects
              </h1>
              <p className="text-[16px] text-[#9a9aa3]">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} in your library
              </p>
            </div>
            <Link href="/import">
              <Button size="lg" className="gap-2 rounded-full px-6">
                <Plus className="w-[18px] h-[18px]" />
                Import Project
              </Button>
            </Link>
          </div>

          {/* Active collection/tag context banner */}
          {hasActiveContextFilters && (
            <div className="flex items-center gap-2.5 mb-5 animate-fade">
              <span className="text-[13px] text-[#9a9aa3]">Filtered by</span>
              {collectionId && collectionName && (
                <button
                  onClick={() => setCollectionId('')}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2997ff]/12 border border-[#2997ff]/25 text-[12.5px] font-medium text-[#2997ff] hover:bg-[#2997ff]/20 transition-colors"
                >
                  <FolderGit2 className="w-3.5 h-3.5" />
                  {collectionName}
                  <X className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                </button>
              )}
              {tagId && tagName && (
                <button
                  onClick={() => setTagId('')}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ff9f0a]/12 border border-[#ff9f0a]/25 text-[12.5px] font-medium text-[#ff9f0a] hover:bg-[#ff9f0a]/20 transition-colors"
                >
                  <Hash className="w-3.5 h-3.5" />
                  {tagName}
                  <X className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                </button>
              )}
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3 mb-8 animate-rise" style={{ animationDelay: '0.05s' }}>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9a9aa3]" />
              <Input
                type="text"
                placeholder="Search by name, language, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastModified">Last Modified</SelectItem>
                <SelectItem value="lastOpened">Last Opened</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => setFilterFavorite(!filterFavorite)}
              aria-pressed={filterFavorite}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[14px] font-medium border transition-all duration-200 ${
                filterFavorite
                  ? 'bg-[#ffd60a]/15 border-[#ffd60a]/30 text-[#ffd60a]'
                  : 'bg-white/[0.05] border-white/[0.13] text-white/60 hover:text-white hover:border-white/[0.2]'
              }`}
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>

            <button
              onClick={() => setFilterArchived(!filterArchived)}
              aria-pressed={filterArchived}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[14px] font-medium border transition-all duration-200 ${
                filterArchived
                  ? 'bg-[#0a84ff]/15 border-[#0a84ff]/30 text-[#2997ff]'
                  : 'bg-white/[0.05] border-white/[0.13] text-white/60 hover:text-white hover:border-white/[0.2]'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived
            </button>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <LoadingState message="Loading projects..." />
          ) : error ? (
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8 text-[#ff453a]" />}
              title="Failed to load projects"
              description={error}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLoading(true);
                    setRetryCount((n) => n + 1);
                  }}
                >
                  Try again
                </Button>
              }
              className="py-16"
            />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderGit2 className="h-8 w-8 text-white/30" />}
              title="No projects found"
              description={
                search || language !== 'all' || filterFavorite || filterArchived
                  ? 'Try adjusting your filters'
                  : 'Import your first project to get started'
              }
              action={
                <Link href="/import">
                  <Button variant="secondary" className="rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Import Project
                  </Button>
                </Link>
              }
              className="py-16"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onToggleFavorite={handleToggleFavorite}
                  onArchive={handleArchive}
                  onDelete={(id) => setDeleteTarget(projects.find((p) => p.id === id) || null)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
        title={deleteTarget ? `Remove “${deleteTarget.name}”?` : 'Remove project?'}
        description="This removes the project from CodeShelf only. The project files on disk will not be deleted."
        confirmLabel="Remove Project"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}