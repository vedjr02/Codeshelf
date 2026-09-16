'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { ProjectCard } from '@/components/project-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Star, Archive, FolderGit2, Layers } from 'lucide-react';
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [language, setLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastModified');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [filterArchived, setFilterArchived] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [search, language, sortBy, filterFavorite, filterArchived]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (search) params.set('search', search);
      if (language && language !== 'all') params.set('language', language);
      if (sortBy) params.set('sortBy', sortBy);
      if (filterFavorite) params.set('isFavorite', 'true');
      if (filterArchived) params.set('isArchived', 'true');

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !project.isFavorite }),
      });

      if (res.ok) {
        setProjects(
          projects.map((p) =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
          )
        );
      }
    } catch (error) {
      console.error('Failed to update favorite status:', error);
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

      if (res.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to archive project:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this project from CodeShelf?')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const languages = Array.from(
    new Set(projects.map((p) => p.language).filter(Boolean) as string[])
  );

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-end justify-between mb-8 animate-rise">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-fuchsia-400/80 flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5" />
                Project Library
              </span>
              <h1 className="text-[28px] font-semibold tracking-tight leading-none mb-1">
                All Projects
              </h1>
              <p className="text-[13px] text-white/40">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} in your library
              </p>
            </div>
            <Link href="/import">
              <Button size="sm" className="gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/40">
                <Plus className="w-4 h-4" />
                Import Project
              </Button>
            </Link>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3 mb-6 animate-rise" style={{ animationDelay: '0.05s' }}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <Input
                type="text"
                placeholder="Search by name, language, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/[0.045] border-white/[0.08] text-[13px] rounded-xl focus:ring-violet-500/30"
              />
            </div>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[150px] bg-white/[0.045] border-white/[0.08] text-[13px] rounded-xl">
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
              <SelectTrigger className="w-[150px] bg-white/[0.045] border-white/[0.08] text-[13px] rounded-xl">
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium border transition-all duration-200 ${
                filterFavorite
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-white/[0.045] border-white/[0.08] text-white/60 hover:text-white hover:border-white/[0.15]'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Favorites
            </button>

            <button
              onClick={() => setFilterArchived(!filterArchived)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium border transition-all duration-200 ${
                filterArchived
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                  : 'bg-white/[0.045] border-white/[0.08] text-white/60 hover:text-white hover:border-white/[0.15]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Archived
            </button>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <LoadingState message="Loading projects..." />
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
                  <Button variant="secondary" className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Import Project
                  </Button>
                </Link>
              }
              className="py-16"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 stagger">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onToggleFavorite={handleToggleFavorite}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}