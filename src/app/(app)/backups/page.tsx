'use client';

import * as React from 'react';
import Link from 'next/link';
import { Archive, ChevronRight, Search, Trash2, Undo2 } from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconInput } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RestoreDialog } from '@/components/restore-dialog';
import { useToast } from '@/components/ui/toast';
import { notifyLibraryChanged } from '@/components/library-context';
import { formatBytes, formatExact, formatRelativeTime, getLanguageColor, plural, prettyPath, cn } from '@/lib/utils';

interface BackupItem {
  id: string;
  projectId: string;
  storagePath: string;
  size: number;
  fileCount: number;
  status: string;
  error?: string | null;
  createdAt: string;
  project: { id: string; name: string; path: string; language?: string | null };
}

interface Group {
  projectId: string;
  name: string;
  path: string;
  language?: string | null;
  backups: BackupItem[];
  totalSize: number;
  latest: string;
}

export default function BackupsPage() {
  const { success, error: toastError } = useToast();
  const [backups, setBackups] = React.useState<BackupItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const [restoreTarget, setRestoreTarget] = React.useState<BackupItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<BackupItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Could not load your snapshots');
      setBackups(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your snapshots');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/backup?backupId=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete that snapshot');
      setBackups((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      success('Snapshot deleted', `${deleteTarget.project.name} — ${formatRelativeTime(deleteTarget.createdAt)}`);
      notifyLibraryChanged();
      setDeleteTarget(null);
    } catch (err) {
      toastError('Could not delete snapshot', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Grouped by project: one project's history is one story --------- */
  const groups = React.useMemo<Group[]>(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? backups.filter((b) =>
          [b.project.name, b.project.path, b.status].some((field) => field?.toLowerCase().includes(query))
        )
      : backups;

    const map = new Map<string, Group>();
    filtered.forEach((backup) => {
      const existing = map.get(backup.projectId);
      if (existing) {
        existing.backups.push(backup);
        existing.totalSize += backup.status === 'completed' ? backup.size : 0;
        return;
      }
      map.set(backup.projectId, {
        projectId: backup.projectId,
        name: backup.project.name,
        path: backup.project.path,
        language: backup.project.language,
        backups: [backup],
        totalSize: backup.status === 'completed' ? backup.size : 0,
        latest: backup.createdAt,
      });
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        backups: group.backups.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }))
      .map((group) => ({ ...group, latest: group.backups[0].createdAt }))
      .sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime());
  }, [backups, search]);

  const completed = backups.filter((b) => b.status === 'completed');
  const failed = backups.filter((b) => b.status === 'failed');
  const totalSize = completed.reduce((sum, b) => sum + b.size, 0);

  return (
    <>
      <PageShell
        title="Backups"
        subtitle="Every snapshot across your library, grouped by project. Restoring always extracts into a new folder."
      >
        {loading ? (
          <SkeletonRows rows={5} />
        ) : error ? (
          <Card className="p-4">
            <ErrorState message={error} retry={load} />
          </Card>
        ) : backups.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Archive />}
              title="No snapshots yet"
              description="Open any project and press Back up. Snapshots skip node_modules, build output and caches, so they stay small."
              action={
                <Button asChild variant="primary" size="sm">
                  <Link href="/projects">Browse projects</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {/* Summary */}
            <Card className="mb-5 grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
              <Stat label="Snapshots" value={String(completed.length)} />
              <Stat label="Storage used" value={formatBytes(totalSize)} />
              <Stat label="Projects covered" value={String(new Set(completed.map((b) => b.projectId)).size)} />
              <Stat
                label="Failed"
                value={String(failed.length)}
                tone={failed.length > 0 ? 'bad' : undefined}
              />
            </Card>

            <div className="mb-5 max-w-[360px]">
              <IconInput
                icon={<Search />}
                type="search"
                placeholder="Filter by project or status…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Filter snapshots"
              />
            </div>

            {groups.length === 0 ? (
              <Card>
                <EmptyState title="No matches" description={`Nothing matches “${search.trim()}”.`} />
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const isOpen = expanded.has(group.projectId);
                  const visible = isOpen ? group.backups : group.backups.slice(0, 1);
                  return (
                    <Card key={group.projectId} className="overflow-hidden">
                      <div className="flex items-center gap-3 border-b-[0.5px] border-line px-5 py-3.5">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: getLanguageColor(group.language) }}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/projects/${group.projectId}`}
                            className="truncate text-[15.5px] font-semibold tracking-[-0.015em] text-ink hover:text-accent-ink"
                          >
                            {group.name}
                          </Link>
                          <p className="mono truncate text-[12.5px] text-ink-4">{prettyPath(group.path)}</p>
                        </div>
                        <span className="hidden shrink-0 text-[13.5px] tabular text-ink-3 sm:block">
                          {plural(group.backups.length, 'snapshot')} · {formatBytes(group.totalSize)}
                        </span>
                      </div>

                      {visible.map((backup) => (
                        <div
                          key={backup.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-[0.5px] border-line px-5 py-2.5 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[14.5px] text-ink" title={formatExact(backup.createdAt)}>
                                {formatRelativeTime(backup.createdAt)}
                              </span>
                              {backup.status === 'failed' && (
                                <Badge tone="bad" size="sm">
                                  Failed
                                </Badge>
                              )}
                              {backup.status === 'in-progress' && (
                                <Badge tone="warn" size="sm">
                                  Running
                                </Badge>
                              )}
                            </div>
                            <p className="text-[13px] tabular text-ink-4">
                              {formatBytes(backup.size)} · {backup.fileCount.toLocaleString()} files
                            </p>
                            {backup.status === 'failed' && backup.error && (
                              <p className="mt-0.5 text-[13px] text-bad">{backup.error}</p>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {backup.status === 'completed' && (
                              <Button variant="secondary" size="sm" onClick={() => setRestoreTarget(backup)}>
                                <Undo2 className="h-[14px] w-[14px]" />
                                Restore
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteTarget(backup)}
                              aria-label={`Delete the snapshot from ${formatExact(backup.createdAt)}`}
                              className="text-ink-4 hover:bg-bad-tint hover:text-bad"
                            >
                              <Trash2 className="h-[15px] w-[15px]" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {group.backups.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(group.projectId)) next.delete(group.projectId);
                              else next.add(group.projectId);
                              return next;
                            })
                          }
                          className="flex w-full items-center gap-1.5 bg-surface-2 px-5 py-2 text-[13.5px] text-ink-3 transition-colors hover:text-ink"
                        >
                          <ChevronRight
                            className={cn(
                              'h-3.5 w-3.5 transition-transform duration-200',
                              isOpen && 'rotate-90'
                            )}
                          />
                          {isOpen ? 'Hide older snapshots' : `${group.backups.length - 1} older`}
                        </button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </PageShell>

      <RestoreDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        backup={restoreTarget}
        projectName={restoreTarget?.project.name ?? ''}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this snapshot?"
        description={
          deleteTarget
            ? `${deleteTarget.project.name}, taken ${formatExact(deleteTarget.createdAt)}.`
            : undefined
        }
        detail="The zip file is removed from disk permanently. Your project files are not affected."
        confirmLabel="Delete snapshot"
        destructive
        loading={deleting}
        onConfirm={remove}
      />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'bad' }) {
  return (
    <div className="bg-surface px-5 py-4">
      <div className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-4">{label}</div>
      <div
        className={cn(
          'mt-1 text-[21px] font-semibold tabular tracking-[-0.02em]',
          tone === 'bad' ? 'text-bad' : 'text-ink'
        )}
      >
        {value}
      </div>
    </div>
  );
}
