'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Code2,
  ExternalLink,
  File,
  FileCode,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
  ShieldPlus,
  Star,
  Terminal,
} from 'lucide-react';
import { PageShell, Section } from '@/components/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ScoreRing, ScoreBreakdown } from '@/components/score';
import { BackupTimeline } from '@/components/backup-timeline';
import { RestoreDialog } from '@/components/restore-dialog';
import { StoragePanel } from '@/components/storage-panel';
import { ProjectFiling } from '@/components/project-filing';
import { useProjectActions, ProjectMenu } from '@/components/project-actions';
import { useToast } from '@/components/ui/toast';
import { formatBytes, formatExact, formatRelativeTime, getLanguageColor, prettyPath, cn } from '@/lib/utils';
import { gradeLabel, type HealthReport } from '@/lib/health';
import type { BackupRecord, ProjectSummary } from '@/types/client';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: FileNode[];
}

/** Detail carries full backup records, where the list carries summaries. */
interface ProjectDetail extends Omit<ProjectSummary, 'backups'> {
  readme?: string | null;
  dependencies: Array<{ name: string; version: string; type: string }>;
  devDependencies: Array<{ name: string; version: string; type: string }>;
  scripts: Array<{ name: string; command: string }>;
  fileStructure: FileNode[];
  backups: BackupRecord[];
  health: HealthReport;
}

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Project" back={{ href: '/projects', label: 'Projects' }}>
          <Skeleton className="h-64 w-full rounded-[var(--radius-xl)]" />
        </PageShell>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { success, error: toastError } = useToast();

  const [project, setProject] = React.useState<ProjectDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [notes, setNotes] = React.useState('');
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [backingUp, setBackingUp] = React.useState(false);

  const [restoreTarget, setRestoreTarget] = React.useState<BackupRecord | null>(null);
  const [deleteBackup, setDeleteBackup] = React.useState<BackupRecord | null>(null);
  const [deletingBackup, setDeletingBackup] = React.useState(false);
  const [deleteProject, setDeleteProject] = React.useState<ProjectSummary | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('This project is not in your library.');
      const data = (await res.json()) as ProjectDetail;
      setProject(data);
      setNotes(data.notes ?? '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    const signal = { cancelled: false };
    (async () => {
      await load();
      if (signal.cancelled) return;
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const actions = useProjectActions({
    onPatched: (_, patch) => setProject((prev) => (prev ? { ...prev, ...patch } : prev)),
    onRefreshed: () => void load(),
  });

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Could not save your notes');
      success('Notes saved');
      await load();
    } catch (err) {
      toastError('Could not save notes', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const takeSnapshot = async () => {
    if (!project) return;
    setBackingUp(true);
    try {
      const ok = await actions.backUpNow(project);
      if (ok) await load();
    } finally {
      setBackingUp(false);
    }
  };

  const removeBackup = async () => {
    if (!deleteBackup) return;
    setDeletingBackup(true);
    try {
      const res = await fetch(`/api/backup?backupId=${deleteBackup.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete that snapshot');
      success('Snapshot deleted');
      setDeleteBackup(null);
      await load();
    } catch (err) {
      toastError('Could not delete snapshot', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDeletingBackup(false);
    }
  };

  if (loading) {
    return (
      <PageShell title="Loading…" back={{ href: '/projects', label: 'Projects' }}>
        <div className="space-y-5">
          <Skeleton className="h-[184px] w-full rounded-[var(--radius-xl)]" />
          <Skeleton className="h-[320px] w-full rounded-[var(--radius-xl)]" />
        </div>
      </PageShell>
    );
  }

  if (error || !project) {
    return (
      <PageShell title="Project not found" back={{ href: '/projects', label: 'Projects' }}>
        <Card className="p-4">
          <ErrorState
            title="We could not open this project"
            message={error ?? 'It may have been removed from your library.'}
            retry={load}
          />
        </Card>
      </PageShell>
    );
  }

  const languageColor = getLanguageColor(project.language);
  const busy = actions.pending === project.id;

  return (
    <>
      <PageShell
        title={project.name}
        back={{ href: '/projects', label: 'Projects' }}
        width="wide"
        subtitle={
          <span className="mono text-[14px] text-ink-4" title={project.path}>
            {prettyPath(project.path)}
          </span>
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={project.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={project.isFavorite}
              onClick={() => void actions.toggleFavorite(project)}
            >
              <Star className={cn('h-[18px] w-[18px]', project.isFavorite ? 'fill-warn text-warn' : 'text-ink-4')} />
            </Button>
            <Button variant="secondary" size="pill" disabled={busy} onClick={() => void actions.openIn(project, 'editor')}>
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Open</span>
            </Button>
            <Button variant="primary" size="pill" disabled={backingUp || busy} onClick={() => void takeSnapshot()}>
              {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPlus className="h-4 w-4" />}
              {backingUp ? 'Backing up…' : 'Back up'}
            </Button>
            <ProjectMenu project={project} actions={actions} onRequestDelete={setDeleteProject} />
          </>
        }
      >
        {/* ---- Score + facts --------------------------------------------- */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex flex-col gap-6 p-6 sm:flex-row">
              <ScoreRing score={project.health.score} grade={project.health.grade} size={104} thickness={8} caption="Score" />
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
                  {gradeLabel(project.health.grade)}
                </h2>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-3">{project.health.headline}</p>
                <div className="mt-5">
                  <ProjectFiling
                    projectId={project.id}
                    tags={project.tags}
                    collections={project.collections}
                    onChanged={(next) => setProject((prev) => (prev ? { ...prev, ...next } : prev))}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px border-t-[0.5px] border-line bg-line sm:grid-cols-4">
              <Fact label="Language" value={project.language ?? 'Unknown'} dot={project.language ? languageColor : undefined} />
              <Fact label="Size" value={formatBytes(project.size)} />
              <Fact
                label="Branch"
                value={project.isGitRepo ? project.gitBranch ?? 'detached' : 'No git'}
                hint={project.gitStatus === 'dirty' ? 'Uncommitted changes' : undefined}
                hintTone={project.gitStatus === 'dirty' ? 'warn' : undefined}
              />
              <Fact label="Last backup" value={formatRelativeTime(project.lastBackupAt)} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-[15.5px] font-semibold tracking-[-0.015em]">What makes up the score</h2>
            <ScoreBreakdown report={project.health} className="mt-4" />
          </Card>
        </div>

        {/* ---- Sections -------------------------------------------------- */}
        <Tabs defaultValue="overview" className="mt-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">
              Timeline
              {project.backups.length > 0 && <span className="ml-1.5 text-ink-4">{project.backups.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="readme">README</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="pt-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Card className="p-5">
                <h3 className="text-[16px] font-semibold tracking-[-0.015em]">Details</h3>
                <dl className="mt-4 space-y-0">
                  <Detail label="Framework" value={project.framework ?? 'None detected'} />
                  <Detail label="Package manager" value={project.packageManager ?? 'None detected'} />
                  <Detail label="Modified" value={formatExact(project.lastModified)} />
                  <Detail label="Last opened" value={formatExact(project.lastOpened)} />
                  <Detail
                    label="Remote"
                    value={
                      project.gitRemote ? (
                        <a
                          href={project.gitRemote.startsWith('http') ? project.gitRemote : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono inline-flex max-w-[220px] items-center gap-1 truncate text-accent-ink hover:underline"
                        >
                          {project.gitRemote}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        'None'
                      )
                    }
                  />
                </dl>

                <div className="mt-5 flex flex-wrap gap-2 border-t-[0.5px] border-line pt-4">
                  <Button variant="secondary" size="sm" onClick={() => void actions.openIn(project, 'finder')}>
                    <FolderOpen className="h-[15px] w-[15px]" />
                    Reveal
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void actions.openIn(project, 'terminal')}>
                    <Terminal className="h-[15px] w-[15px]" />
                    Terminal
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void actions.refresh(project)} disabled={busy}>
                    <RefreshCw className={cn('h-[15px] w-[15px]', busy && 'animate-spin')} />
                    Refresh from disk
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-[16px] font-semibold tracking-[-0.015em]">Scripts</h3>
                {project.scripts.length === 0 ? (
                  <p className="mt-4 text-[14px] text-ink-4">No scripts declared in this project.</p>
                ) : (
                  <ul className="mt-4 space-y-1.5">
                    {project.scripts.map((script) => (
                      <li key={script.name} className="rounded-[var(--radius-md)] bg-surface-3 px-3 py-2">
                        <div className="mono text-[13.5px] font-medium text-ink">{script.name}</div>
                        <div className="mono mt-0.5 truncate text-[12.5px] text-ink-4" title={script.command}>
                          {script.command}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline" className="pt-6">
            <Section
              title="Snapshot timeline"
              description="Every snapshot, and how much the project grew or shrank between them."
              action={
                <Button variant="secondary" size="sm" onClick={() => void takeSnapshot()} disabled={backingUp}>
                  <ShieldPlus className="h-[15px] w-[15px]" />
                  New snapshot
                </Button>
              }
            >
              <Card className="p-6">
                <BackupTimeline
                  backups={project.backups}
                  onRestore={setRestoreTarget}
                  onDelete={setDeleteBackup}
                />
              </Card>
            </Section>
          </TabsContent>

          {/* Storage */}
          <TabsContent value="storage" className="pt-6">
            <Section
              title="Manage storage"
              description="What this project is really costing you on disk, and what is safe to remove."
            >
              <StoragePanel projectId={project.id} onChanged={() => void load()} />
            </Section>
          </TabsContent>

          {/* Files */}
          <TabsContent value="files" className="pt-6">
            <Card className="overflow-hidden">
              {project.fileStructure.length === 0 ? (
                <EmptyState
                  title="Nothing to show"
                  description="The folder could not be read, or it contains only ignored files."
                />
              ) : (
                <FileTree nodes={project.fileStructure} />
              )}
            </Card>
          </TabsContent>

          {/* Dependencies */}
          <TabsContent value="dependencies" className="pt-6">
            <div className="grid gap-5 md:grid-cols-2">
              {[
                { label: 'Dependencies', items: project.dependencies },
                { label: 'Dev dependencies', items: project.devDependencies },
              ].map(({ label, items }) => (
                <Card key={label} className="overflow-hidden">
                  <div className="flex items-center justify-between border-b-[0.5px] border-line px-5 py-3.5">
                    <h3 className="text-[16px] font-semibold tracking-[-0.015em]">{label}</h3>
                    <Badge tone="neutral" size="sm">
                      {items.length}
                    </Badge>
                  </div>
                  {items.length === 0 ? (
                    <p className="px-5 py-6 text-[14px] text-ink-4">None declared.</p>
                  ) : (
                    <ul className="max-h-[420px] overflow-y-auto">
                      {items.map((dep) => (
                        <li
                          key={dep.name}
                          className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-line px-5 py-2 last:border-b-0"
                        >
                          <span className="mono min-w-0 truncate text-[13.5px] text-ink">{dep.name}</span>
                          <span className="mono shrink-0 text-[13px] tabular text-ink-4">{dep.version}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* README */}
          <TabsContent value="readme" className="pt-6">
            <Card className="p-6 sm:p-8">
              {project.readme ? (
                <pre className="whitespace-pre-wrap font-sans text-[15px] leading-[1.7] text-ink-2">
                  {project.readme}
                </pre>
              ) : (
                <EmptyState
                  icon={<FileCode />}
                  title="No README"
                  description="Add a README.md to the project folder and refresh — it is worth 12 points of Shelf Score, and it is what you will read in a year."
                />
              )}
            </Card>
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="pt-6">
            <Card className="p-6">
              <h3 className="text-[16px] font-semibold tracking-[-0.015em]">Your notes</h3>
              <p className="mt-1 text-[14px] text-ink-3">
                Private to CodeShelf — decisions, TODOs, the thing you always forget.
              </p>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={12}
                placeholder="Why this project exists, what is half-finished, where the deploy lives…"
                className="mono mt-4"
              />
              <div className="mt-3 flex items-center gap-3">
                <Button variant="primary" size="sm" onClick={() => void saveNotes()} disabled={savingNotes}>
                  {savingNotes ? 'Saving…' : 'Save notes'}
                </Button>
                {notes !== (project.notes ?? '') && (
                  <span className="text-[13.5px] text-ink-4">Unsaved changes</span>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </PageShell>

      <RestoreDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        backup={restoreTarget}
        projectName={project.name}
      />

      <ConfirmDialog
        open={deleteBackup !== null}
        onOpenChange={(open) => !open && setDeleteBackup(null)}
        title="Delete this snapshot?"
        description={deleteBackup ? `Taken ${formatExact(deleteBackup.createdAt)}.` : undefined}
        detail="The zip file is removed from disk permanently. Your project files are not affected."
        confirmLabel="Delete snapshot"
        destructive
        loading={deletingBackup}
        onConfirm={removeBackup}
      />

      <ConfirmDialog
        open={deleteProject !== null}
        onOpenChange={(open) => !open && setDeleteProject(null)}
        title={`Remove “${project.name}” from CodeShelf?`}
        description="This removes it from your library only."
        detail="The folder and every file inside it stay exactly where they are on disk."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          const ok = await actions.remove(project);
          if (ok) router.push('/projects');
        }}
      />
    </>
  );
}

function Fact({
  label,
  value,
  hint,
  hintTone,
  dot,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: 'warn';
  dot?: string;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <div className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-4">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        {dot && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />}
        <span className="truncate text-[15.5px] font-medium text-ink">{value}</span>
      </div>
      {hint && <div className={cn('mt-0.5 text-[12.5px]', hintTone === 'warn' ? 'text-warn' : 'text-ink-4')}>{hint}</div>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-line py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13.5px] text-ink-4">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[14px] font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Two-level tree: enough to recognise a project, not a file browser. */
function FileTree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? 'py-1.5' : undefined}>
      {nodes.map((node) => (
        <li key={node.path}>
          <div
            className="flex items-center gap-2 px-5 py-[5px] text-[13.5px] transition-colors hover:bg-surface-3"
            style={{ paddingLeft: 20 + depth * 16 }}
          >
            {node.type === 'directory' ? (
              <Folder className="h-[14px] w-[14px] shrink-0 text-accent-ink" />
            ) : (
              <File className="h-[14px] w-[14px] shrink-0 text-ink-5" />
            )}
            <span className="mono min-w-0 flex-1 truncate text-ink-2">{node.name}</span>
            {node.size !== undefined && (
              <span className="shrink-0 text-[12.5px] tabular text-ink-5">{formatBytes(node.size)}</span>
            )}
          </div>
          {node.children && node.children.length > 0 && depth < 1 && (
            <FileTree nodes={node.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}
