'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { formatBytes, formatDate } from '@/lib/utils';
import { Star, FolderSync, Trash2, FileCode, HardDrive, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface ProjectDetail {
  id: string;
  name: string;
  path: string;
  language?: string | null;
  framework?: string | null;
  size: number;
  lastModified?: string | null;
  readme?: string | null;
  notes?: string | null;
  isGitRepo: boolean;
  gitBranch?: string | null;
  isFavorite: boolean;
  tags: Array<{ id: string; name: string; color: string }>;
  dependencies: Array<{ name: string; version: string; type: string }>;
  devDependencies: Array<{ name: string; version: string; type: string }>;
  scripts: Array<{ name: string; command: string }>;
  fileStructure: Array<{ name: string; type: 'file' | 'directory'; size?: number }>;
  backups: Array<{ id: string; size: number; fileCount: number; createdAt: string }>;
}

function ProjectDetailContent() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Project not found');
      const data = await res.json();
      setProject(data);
      setNotes(data.notes || '');
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true);
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) setProject((prev) => (prev ? { ...prev, notes } : null));
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      if (!res.ok) throw new Error('Backup failed');
      setTimeout(() => {
        setIsBackingUp(false);
        fetchProject();
      }, 300);
    } catch (error) {
      console.error('Backup error:', error);
      setIsBackingUp(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Delete this backup?')) return;
    try {
      const res = await fetch(`/api/backup?backupId=${backupId}`, { method: 'DELETE' });
      if (res.ok) {
        setProject((prev) => (prev ? { ...prev, backups: prev.backups.filter((b) => b.id !== backupId) } : null));
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !project.isFavorite }),
      });
      if (res.ok) setProject((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Loading project details..." />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="Project not found"
            description="The requested project could not be found."
            action={
              <Link href="/projects">
                <Button variant="secondary">Back to Projects</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <Link href="/projects" className="inline-flex items-center text-[13px] text-zinc-500 hover:text-white mb-6 transition-colors">
            ← Back to Projects
          </Link>

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight leading-none mb-1">{project.name}</h1>
              <p className="text-[12px] text-zinc-500 font-mono">{project.path}</p>
              {project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.tags.map((tag) => (
                    <span key={tag.id} className="px-2 py-0.5 text-[10.5px] rounded-full" style={{ backgroundColor: `${tag.color}18`, color: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={handleToggleFavorite}>
                <Star className={`w-5 h-5 ${project.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-500'}`} />
              </Button>
              <Button onClick={handleCreateBackup} disabled={isBackingUp} size="sm" className="gap-1.5">
                <FolderSync className="w-4 h-4" />
                {isBackingUp ? 'Backing up...' : 'Create Backup'}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-zinc-900 border border-zinc-800">
              {['overview', 'readme', 'files', 'dependencies', 'backups', 'notes'].map((tab) => (
                <TabsTrigger key={tab} value={tab} className="capitalize text-[13px]">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="p-5 bg-zinc-900/80 border-zinc-800">
                <h3 className="text-[13px] font-semibold mb-4">Project Info</h3>
                <div className="space-y-3">
                  {[
                    { k: 'Language', v: project.language },
                    { k: 'Framework', v: project.framework },
                    { k: 'Size', v: formatBytes(project.size) },
                    { k: 'Last Modified', v: formatDate(project.lastModified) },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-zinc-800">
                      <span className="text-[12px] text-zinc-500">{k}</span>
                      <span className="text-[12.5px] font-medium">{v || 'None'}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="readme">
              <Card className="p-6 bg-zinc-900/80 border-zinc-800">
                {project.readme ? (
                  <pre className="whitespace-pre-wrap font-sans text-[13.5px] text-zinc-400 leading-relaxed">{project.readme}</pre>
                ) : (
                  <EmptyState
                    icon={<FileCode className="w-8 h-8 text-zinc-500" />}
                    title="No README found"
                    description="Add a README.md to your project to see it here."
                  />
                )}
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card className="p-5 bg-zinc-900/80 border-zinc-800">
                <h3 className="text-[13px] font-semibold mb-4">File Tree</h3>
                {project.fileStructure.length === 0 ? (
                  <p className="text-[12px] text-zinc-500">No files found</p>
                ) : (
                  <div className="font-mono text-[12.5px]">
                    {project.fileStructure.map((item) => (
                      <div key={item.name} className="flex justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/60">
                        <span>{item.type === 'directory' ? `${item.name}/` : item.name}</span>
                        {item.size && <span className="text-[11px] text-zinc-500">{formatBytes(item.size)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="dependencies">
              <Card className="p-5 bg-zinc-900/80 border-zinc-800">
                <h3 className="text-[13px] font-semibold mb-4">Dependencies ({project.dependencies.length})</h3>
                {project.dependencies.length === 0 ? (
                  <p className="text-[12px] text-zinc-500">No dependencies</p>
                ) : (
                  <div className="space-y-0.5 max-h-80 overflow-auto">
                    {project.dependencies.map((dep) => (
                      <div key={dep.name} className="flex justify-between py-2 px-2 rounded-lg hover:bg-zinc-800/60 text-[12.5px]">
                        <span className="font-mono truncate mr-3">{dep.name}</span>
                        <span className="text-zinc-500 font-mono">{dep.version}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="backups">
              <Card className="p-5 bg-zinc-900/80 border-zinc-800">
                <h3 className="text-[13px] font-semibold mb-4">Backups</h3>
                {project.backups.length === 0 ? (
                  <EmptyState
                    icon={<HardDrive className="w-8 h-8 text-zinc-500" />}
                    title="No backups yet"
                    description="Create a backup to protect your project code."
                    action={<Button variant="secondary" onClick={handleCreateBackup} disabled={isBackingUp}>Create First Backup</Button>}
                  />
                ) : (
                  <div className="space-y-2.5">
                    {project.backups.map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-[13px] font-medium">{formatDate(backup.createdAt)}</p>
                            <p className="text-[11px] text-zinc-500">{formatBytes(backup.size)} · {backup.fileCount} files</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBackup(backup.id)} className="h-8 w-8 text-zinc-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card className="p-5 bg-zinc-900/80 border-zinc-800">
                <h3 className="text-[13px] font-semibold mb-4">Project Notes</h3>
                <div className="space-y-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add personal notes, TODOs, architecture decisions..."
                    rows={8}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono resize-y"
                  />
                  <Button onClick={handleSaveNotes} disabled={isSavingNotes} size="sm">
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading project..." />}>
      <ProjectDetailContent />
    </Suspense>
  );
}