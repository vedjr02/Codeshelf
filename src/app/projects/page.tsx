'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { ProjectCard } from '@/components/project-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { Search, Plus, FolderGit2 } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  path: string;
  language?: string | null;
  framework?: string | null;
  size: number;
  lastModified?: string | null;
  isGitRepo?: boolean;
  gitBranch?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  tags?: Array<{ id: string; name: string; color: string }>;
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

  useEffect(() => {
    fetchProjects();
  }, [search]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
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
        setProjects(projects.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)));
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
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
      if (res.ok) fetchProjects();
    } catch (error) {
      console.error('Failed to archive project:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this project from CodeShelf?')) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) setProjects(projects.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight mb-1">All Projects</h1>
              <p className="text-[13px] text-zinc-500">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} in your library
              </p>
            </div>
            <Link href="/import">
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Import Project
              </Button>
            </Link>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-900/80 border-zinc-800 text-[13px]"
            />
          </div>

          {loading ? (
            <LoadingState message="Loading projects..." />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderGit2 className="h-8 w-8 text-zinc-500" />}
              title={search ? 'No projects match' : 'No projects found'}
              description={
                search ? 'Try a different search' : 'Import your first project to get started'
              }
              action={
                <Link href="/import">
                  <Button variant="secondary">Import Project</Button>
                </Link>
              }
              className="py-16"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
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