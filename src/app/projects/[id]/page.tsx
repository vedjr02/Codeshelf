'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LoadingState, EmptyState } from '@/components/ui/states';
import {
  formatBytes,
  formatDate,
  formatRelativeTime,
  getLanguageColor,
} from '@/lib/utils';
import {
  ExternalLink,
  Star,
  HardDrive,
  FileCode,
  FolderSync,
  Trash2,
  Folder,
  File,
  Plus,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ProjectDetail {
  id: string;
  name: string;
  path: string;
  description?: string | null;
  language?: string | null;
  framework?: string | null;
  packageManager?: string | null;
  size: number;
  lastModified?: string | null;
  lastOpened?: string | null;
  readme?: string | null;
  notes?: string | null;
  isGitRepo: boolean;
  gitBranch?: string | null;
  gitRemote?: string | null;
  gitStatus?: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  tags: Array<{ id: string; name: string; color: string }>;
  collections: Array<{ id: string; name: string }>;
  dependencies: Array<{ name: string; version: string; type: string }>;
  devDependencies: Array<{ name: string; version: string; type: string }>;
  scripts: Array<{ name: string; command: string }>;
  fileStructure: Array<{
    name: string;
    type: 'file' | 'directory';
    path: string;
    size?: number;
    children?: any[];
  }>;
  backups: Array<{
    id: string;
    provider: string;
    storagePath: string;
    size: number;
    fileCount: number;
    status: string;
    progress: number;
    createdAt: string;
  }>;
}

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

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
      if (res.ok) {
        setProject((prev) => (prev ? { ...prev, notes } : null));
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setBackupProgress(10);
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      if (!res.ok) throw new Error('Backup failed');
      setBackupProgress(100);
      setTimeout(() => {
        setIsBackingUp(false);
        fetchProject();
      }, 500);
    } catch (error) {
      console.error('Backup error:', error);
      setIsBackingUp(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    try {
      const res = await fetch(`/api/backup?backupId=${backupId}`, { method: 'DELETE' });
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, backups: prev.backups.filter((b) => b.id !== backupId) } : null);
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
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
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
                <Button variant="secondary" className="rounded-xl">Back to Projects</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const languageColor = getLanguageColor(project.language);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {/* Back */}
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-[13px] text-white/45 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>

          {/* Hero Header */}
          <div className="relative mb-8 animate-rise">
            <div className="flex items-start gap-5">
              {/* Language tile */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${languageColor}16` }}
              >
                <span className="w-4 h-4 rounded-full lang-dot" style={{ color: languageColor, backgroundColor: languageColor }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-[28px] font-semibold tracking-tight leading-none truncate">{project.name}</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    className="h-9 w-9 shrink-0"
                  >
                    <Star className={`w-5 h-5 transition-colors ${project.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white/30 hover:text-yellow-400/60'}`} />
                  </Button>
                </div>
                <p className="text-[12px] text-white/35 font-mono truncate mt-1">{project.path}</p>

                {/* Tags */}
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

              <Button
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                size="sm"
                className="shrink-0 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500/80 hover:to-teal-500/80 text-white shadow-lg shadow-emerald-900/30 disabled:opacity-50"
              >
                <FolderSync className="w-4 h-4" />
                {isBackingUp ? 'Backing up...' : 'Create Backup'}
              </Button>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 stagger">
              {[
                { label: 'Language', value: project.language || 'Unknown', color: languageColor },
                { label: 'Size', value: formatBytes(project.size), color: '#94a3b8' },
                { label: 'Git', value: project.isGitRepo ? project.gitBranch || 'main' : 'Not a repo', color: project.isGitRepo ? '#94a3b8' : '#525252' },
                { label: 'Modified', value: formatRelativeTime(project.lastModified), color: '#94a3b8' },
              ].map((chip) => (
                <div key={chip.label} className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/30 mb-1">{chip.label}</div>
                  <div className="text-[13px] font-medium truncate" style={{ color: chip.color }}>{chip.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Backup Progress */}
          {isBackingUp && (
            <Card className="mb-6 p-4 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between text-[13px] mb-2">
                <span className="text-emerald-300">Backing up project...</span>
                <span className="text-emerald-400 tabular-nums">{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="h-1.5" />
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white/[0.04] rounded-xl border border-white/[0.07] p-1 gap-0.5">
              {['overview','readme','files','dependencies','backups','notes'].map((tab) => (
                <TabsTrigger key={tab} value={tab} className="rounded-lg text-[13px] capitalize data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 transition-colors">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <Card className="p-5 bg-white/[0.03] border-white/[0.07]">
                  <h3 className="text-[13px] font-semibold mb-4 tracking-tight">Project Info</h3>
                  <div className="space-y-3">
                    {[
                      { k: 'Framework', v: project.framework },
                      { k: 'Package Manager', v: project.packageManager },
                      { k: 'Last Opened', v: formatDate(project.lastOpened) },
                    ].map(({ k, v }) => (
                      <div key={k} className="flex justify-between py-1.5 border-b border-white/[0.05]">
                        <span className="text-[12px] text-white/40">{k}</span>
                        <span className="text-[12.5px] font-medium">{v || 'None'}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                      <span className="text-[12px] text-white/40">Git Remote</span>
                      {project.gitRemote ? (
                        <a href={project.gitRemote} target="_blank" rel="noopener noreferrer"
                          className="text-[12.5px] text-sky-400 hover:underline flex items-center gap-1 truncate max-w-[200px]">
                          {project.gitRemote}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : <span className="text-[12.5px] text-white/30">None</span>}
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-white/[0.03] border-white/[0.07]">
                  <h3 className="text-[13px] font-semibold mb-4 tracking-tight">Scripts</h3>
                  {project.scripts.length === 0 ? (
                    <p className="text-[12px] text-white/35">No scripts found</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-auto no-scrollbar">
                      {project.scripts.map((script) => (
                        <div key={script.name} className="p-2.5 rounded-lg bg-white/[0.04] font-mono text-[11.5px]">
                          <div className="font-semibold text-white/80 mb-0.5">{script.name}</div>
                          <div className="text-white/40 truncate">{script.command}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* README */}
            <TabsContent value="readme">
              <Card className="p-6 bg-white/[0.03] border-white/[0.07]">
                {project.readme ? (
                  <pre className="whitespace-pre-wrap font-sans text-[13.5px] text-white/75 leading-relaxed">{project.readme}</pre>
                ) : (
                  <EmptyState
                    icon={<FileCode className="w-8 h-8 text-white/30" />}
                    title="No README found"
                    description="Add a README.md to your project to see it here."
                  />
                )}
              </Card>
            </TabsContent>

            {/* Files */}
            <TabsContent value="files">
              <Card className="p-5 bg-white/[0.03] border-white/[0.07]">
                <h3 className="text-[13px] font-semibold mb-4 tracking-tight">File Tree</h3>
                {project.fileStructure.length === 0 ? (
                  <p className="text-[12px] text-white/35">No files found</p>
                ) : (
                  <div className="space-y-0.5 font-mono text-[12.5px]">
                    {project.fileStructure.map((item) => (
                      <div key={item.path} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                        {item.type === 'directory' ? <Folder className="w-4 h-4 text-sky-400 shrink-0" /> : <File className="w-4 h-4 text-white/30 shrink-0" />}
                        <span className="truncate">{item.name}</span>
                        {item.size && <span className="text-[11px] text-white/25 ml-auto tabular-nums shrink-0">{formatBytes(item.size)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Dependencies */}
            <TabsContent value="dependencies" className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: 'Dependencies', items: project.dependencies, empty: 'No dependencies' },
                  { label: 'Dev Dependencies', items: project.devDependencies, empty: 'No dev dependencies' },
                ].map(({ label, items, empty }) => (
                  <Card key={label} className="p-5 bg-white/[0.03] border-white/[0.07]">
                    <h3 className="text-[13px] font-semibold mb-4 tracking-tight">{label} ({items.length})</h3>
                    {items.length === 0 ? <p className="text-[12px] text-white/35">{empty}</p> : (
                      <div className="space-y-0.5 max-h-80 overflow-auto no-scrollbar">
                        {items.map((dep) => (
                          <div key={dep.name} className="flex justify-between py-2 px-2 rounded-lg hover:bg-white/[0.04] text-[12.5px]">
                            <span className="font-mono truncate mr-3">{dep.name}</span>
                            <span className="text-white/35 font-mono tabular-nums shrink-0">{dep.version}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Backups */}
            <TabsContent value="backups">
              <Card className="p-5 bg-white/[0.03] border-white/[0.07]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[13px] font-semibold tracking-tight">Backups</h3>
                  <Button size="sm" variant="secondary" onClick={handleCreateBackup} disabled={isBackingUp} className="rounded-xl gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    New Backup
                  </Button>
                </div>
                {project.backups.length === 0 ? (
                  <EmptyState
                    icon={<HardDrive className="w-8 h-8 text-white/30" />}
                    title="No backups yet"
                    description="Create a backup to protect your project code."
                    action={<Button variant="secondary" onClick={handleCreateBackup} disabled={isBackingUp} className="rounded-xl">Create First Backup</Button>}
                  />
                ) : (
                  <div className="space-y-2.5">
                    {project.backups.map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.035] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium">{formatDate(backup.createdAt)}</p>
                            <p className="text-[11px] text-white/40 tabular-nums">{formatBytes(backup.size)} · {backup.fileCount} files</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBackup(backup.id)} className="h-8 w-8 text-white/30 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Notes */}
            <TabsContent value="notes">
              <Card className="p-5 bg-white/[0.03] border-white/[0.07]">
                <h3 className="text-[13px] font-semibold mb-4 tracking-tight">Project Notes</h3>
                <div className="space-y-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add personal notes, TODOs, architecture decisions..."
                    rows={8}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-white/[0.15] transition-all font-mono resize-y"
                  />
                  <Button onClick={handleSaveNotes} disabled={isSavingNotes} size="sm" className="rounded-xl gap-1.5">
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
