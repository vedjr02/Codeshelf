'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
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

  const fetchProjects = useCallback(async () => {
    try {
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
  }, [search, language, sortBy, filterFavorite, filterArchived]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
        <div className="max-w-7xl mx-auto px-10 py-10">
          {/* Header */}
          <div className="flex items-end justify-between mb-10 animate-rise">
            <div>
              <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2997ff]/80 flex items-center gap-1.5 mb-3">
                <Layers className="w-4 h-4" />
                Project Library
              </span>
              <h1 className="text-[40px] font-semibold tracking-tight leading-none mb-2">
                All Projects
              </h1>
              <p className="text-[16px] text-[#86868b]">
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

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3 mb-8 animate-rise" style={{ animationDelay: '0.05s' }}>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#86868b]" />
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[14px] font-medium border transition-all duration-200 ${
                filterFavorite
                  ? 'bg-[#ffd60a]/15 border-[#ffd60a]/30 text-[#ffd60a]'
                  : 'bg-white/[0.05] border-white/[0.1] text-white/60 hover:text-white hover:border-white/[0.2]'
              }`}
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>

            <button
              onClick={() => setFilterArchived(!filterArchived)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[14px] font-medium border transition-all duration-200 ${
                filterArchived
                  ? 'bg-[#0a84ff]/15 border-[#0a84ff]/30 text-[#2997ff]'
                  : 'bg-white/[0.05] border-white/[0.1] text-white/60 hover:text-white hover:border-white/[0.2]'
              }`}
            >
              <Archive className="w-4 h-4" />
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