'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
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

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: FileNode[];
}

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
  fileStructure: FileNode[];
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
  const id = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const fetchProject = useCallback(async () => {
    try {
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
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

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
        <div className="max-w-7xl mx-auto px-10 py-10">
          {/* Back */}
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-[14px] text-[#86868b] hover:text-white mb-7 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>

          {/* Hero Header */}
          <div className="relative mb-10 animate-rise">
            <div className="flex items-start gap-6">
              {/* Language tile */}
              <div
                className="w-[68px] h-[68px] rounded-[18px] flex items-center justify-center shrink-0 border border-white/[0.08]"
                style={{ backgroundColor: `${languageColor}14` }}
              >
                <span className="w-5 h-5 rounded-full lang-dot" style={{ color: languageColor, backgroundColor: languageColor }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-[40px] font-semibold tracking-tight leading-none truncate">{project.name}</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    className="h-11 w-11 shrink-0"
                  >
                    <Star className={`w-6 h-6 transition-colors ${project.isFavorite ? 'text-[#ffd60a] fill-[#ffd60a]' : 'text-white/30 hover:text-[#ffd60a]/60'}`} />
                  </Button>
                </div>
                <p className="text-[13px] text-[#86868b] font-mono truncate mt-1.5">{project.path}</p>

                {/* Tags */}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {project.tags.map((tag) => (
                      <span key={tag.id} className="px-3 py-1 text-[12px] rounded-full" style={{ backgroundColor: `${tag.color}18`, color: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                size="lg"
                className="shrink-0 gap-2 rounded-full px-6 bg-[#30d158] text-white hover:bg-[#40e368] disabled:opacity-50 shadow-[0_4px_20px_-4px_rgba(48,209,88,0.5)]"
              >
                <FolderSync className="w-[18px] h-[18px]" />
                {isBackingUp ? 'Backing up...' : 'Create Backup'}
              </Button>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 stagger">
              {[
                { label: 'Language', value: project.language || 'Unknown', color: languageColor },
                { label: 'Size', value: formatBytes(project.size), color: '#f5f5f7' },
                { label: 'Git', value: project.isGitRepo ? project.gitBranch || 'main' : 'Not a repo', color: project.isGitRepo ? '#f5f5f7' : '#86868b' },
                { label: 'Modified', value: formatRelativeTime(project.lastModified), color: '#f5f5f7' },
              ].map((chip) => (
                <div key={chip.label} className="px-5 py-4 rounded-[14px] bg-white/[0.04] border border-white/[0.08]">
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/40 mb-1.5">{chip.label}</div>
                  <div className="text-[15px] font-semibold truncate" style={{ color: chip.color }}>{chip.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Backup Progress */}
          {isBackingUp && (
            <Card className="mb-8 p-5 border-[#30d158]/25 bg-[#30d158]/[0.06]">
              <div className="flex items-center justify-between text-[14px] mb-3">
                <span className="text-[#30d158]">Backing up project...</span>
                <span className="text-[#30d158] tabular-nums">{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="h-2" />
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-white/[0.05] border border-white/[0.08] p-1.5 gap-1 w-full sm:w-auto">
              {['overview','readme','files','dependencies','backups','notes'].map((tab) => (
                <TabsTrigger key={tab} value={tab} className="rounded-[10px] text-[14px] capitalize px-4 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 transition-colors">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <Card className="p-6 bg-white/[0.04] border-white/[0.1]">
                  <h3 className="text-[15px] font-semibold mb-4 tracking-tight">Project Info</h3>
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

                <Card className="p-6 bg-white/[0.04] border-white/[0.1]">
                  <h3 className="text-[15px] font-semibold mb-4 tracking-tight">Scripts</h3>
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
              <Card className="p-6 bg-white/[0.04] border-white/[0.1]">
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
              <Card className="p-6 bg-white/[0.04] border-white/[0.1]">
                <h3 className="text-[15px] font-semibold mb-4 tracking-tight">File Tree</h3>
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
                  <Card key={label} className="p-5 bg-white/[0.04] border-white/[0.1]">
                    <h3 className="text-[15px] font-semibold mb-4 tracking-tight">{label} ({items.length})</h3>
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
              <Card className="p-6 bg-white/[0.04] border-white/[0.1]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[15px] font-semibold tracking-tight">Backups</h3>
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
              <Card className="p-6 bg-white/[0.04] border-white/[0.1]">
                <h3 className="text-[15px] font-semibold mb-4 tracking-tight">Project Notes</h3>
                <div className="space-y-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add personal notes, TODOs, architecture decisions..."
                    rows={8}
                    className="w-full rounded-[12px] border border-white/[0.1] bg-white/[0.04] p-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2997ff]/25 focus:border-white/[0.2] transition-all font-mono resize-y"
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
