'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatBytes, formatDate, getLanguageColor } from '@/lib/utils';
import {
  Archive,
  HardDrive,
  Trash2,
  Undo2,
  FolderGit2,
  Search,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface BackupItem {
  id: string;
  projectId: string;
  storagePath: string;
  size: number;
  fileCount: number;
  status: string;
  error?: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    path: string;
    language?: string | null;
  };
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BackupItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null);
  const [restorePath, setRestorePath] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  const { success, error: toastError } = useToast();

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Failed to load backups');
      const data = await res.json();
      setBackups(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/backup?backupId=${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      setBackups((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      success('Backup deleted', `${deleteTarget.project.name} — ${formatDate(deleteTarget.createdAt)}`);
    } else {
      toastError('Could not delete backup', 'Please try again.');
    }
  };

  const openRestore = (backup: BackupItem) => {
    setRestoreTarget(backup);
    setRestorePath('');
  };

  const handleRestore = async () => {
    if (!restoreTarget || !restorePath.trim()) return;
    setRestoreBusy(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: restoreTarget.id, destination: restorePath.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError('Restore failed', data.error || 'Please check the destination path and try again.');
        return;
      }
      success('Backup restored', `Extracted to ${data.path}`);
      setRestoreTarget(null);
    } finally {
      setRestoreBusy(false);
    }
  };

  const filtered = backups.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.project.name.toLowerCase().includes(q) ||
      b.project.path.toLowerCase().includes(q) ||
      b.status.includes(q)
    );
  });

  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  const completed = backups.filter((b) => b.status === 'completed').length;
  const failed = backups.filter((b) => b.status === 'failed').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading backups..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 py-10">
        {/* Header */}
        <div className="mb-10 animate-rise">
          <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#30d158]/80 flex items-center gap-1.5 mb-3">
            <Archive className="w-4 h-4" />
            Protection
          </span>
          <h1 className="text-[40px] font-semibold tracking-tight leading-none mb-2">Backups</h1>
          <p className="text-[16px] text-[#86868b] mt-1">
            Every snapshot across your library — create, restore, and clean up.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-5 mb-8 stagger">
          <Card className="p-5 bg-white/[0.04] border-white/[0.1]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#30d158]/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#30d158]" />
              </div>
              <div>
                <div className="text-[24px] font-semibold tabular-nums leading-none">{completed}</div>
                <div className="text-[12px] text-[#86868b] mt-1.5">Completed</div>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-white/[0.04] border-white/[0.1]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#2997ff]/10 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5 text-[#2997ff]" />
              </div>
              <div>
                <div className="text-[24px] font-semibold tabular-nums leading-none">{formatBytes(totalSize)}</div>
                <div className="text-[12px] text-[#86868b] mt-1.5">Storage used</div>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-white/[0.04] border-white/[0.1]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${failed > 0 ? 'bg-[#ff453a]/10' : 'bg-white/[0.06]'}`}>
                <AlertTriangle className={`w-5 h-5 ${failed > 0 ? 'text-[#ff453a]' : 'text-white/30'}`} />
              </div>
              <div>
                <div className="text-[24px] font-semibold tabular-nums leading-none">{failed}</div>
                <div className="text-[12px] text-[#86868b] mt-1.5">Failed</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        {backups.length > 0 && (
          <div className="relative mb-6 animate-rise" style={{ animationDelay: '0.1s' }}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#86868b]" />
            <Input
              type="text"
              placeholder="Filter by project, path, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* List */}
        {error ? (
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8 text-[#ff453a]" />}
            title="Failed to load backups"
            description={error}
            action={<Button variant="secondary" onClick={fetchBackups}>Try again</Button>}
            className="py-16"
          />
        ) : backups.length === 0 ? (
          <EmptyState
            icon={<Archive className="h-8 w-8 text-white/30" />}
            title="No backups yet"
            description="Create your first backup from any project page to see it here."
            action={
              <Link href="/projects">
                <Button variant="secondary" className="rounded-full">Browse Projects</Button>
              </Link>
            }
            className="py-16"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matches"
            description={`No backups match "${search}".`}
            className="py-16"
          />
        ) : (
          <div className="space-y-2.5 stagger">
            {filtered.map((backup) => {
              const langColor = getLanguageColor(backup.project.language);
              const isFailed = backup.status === 'failed';
              return (
                <Card
                  key={backup.id}
                  className="p-5 bg-white/[0.04] border-white/[0.08] hover:border-white/[0.14] transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Project tile */}
                    <div
                      className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${langColor}14` }}
                    >
                      <FolderGit2 className="w-5 h-5" style={{ color: langColor }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                          href={`/projects/${backup.project.id}`}
                          className="text-[15px] font-semibold tracking-tight hover:text-white/80 transition-colors"
                        >
                          {backup.project.name}
                        </Link>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            isFailed
                              ? 'bg-[#ff453a]/10 text-[#ff453a]'
                              : backup.status === 'completed'
                                ? 'bg-[#30d158]/10 text-[#30d158]'
                                : 'bg-[#ff9f0a]/10 text-[#ff9f0a]'
                          }`}
                        >
                          {backup.status}
                        </span>
                      </div>
                      <p className="text-[12px] text-white/40 mt-1 tabular-nums">
                        {formatDate(backup.createdAt)} · {formatBytes(backup.size)} · {backup.fileCount} files
                      </p>
                      {isFailed && backup.error && (
                        <p className="text-[11.5px] text-[#ff453a]/70 mt-1 truncate">{backup.error}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {backup.status === 'completed' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openRestore(backup)}
                          className="rounded-[10px] gap-1.5 text-[12.5px]"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Restore
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(backup)}
                        className="h-9 w-9 text-white/30 hover:text-[#ff453a] hover:bg-[#ff453a]/10"
                        aria-label="Delete backup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this backup?"
        description={
          deleteTarget
            ? `The zip file for ${deleteTarget.project.name} (${formatDate(deleteTarget.createdAt)}) will be permanently removed from disk.`
            : undefined
        }
        confirmLabel="Delete Backup"
        destructive
        onConfirm={handleDelete}
      />

      {/* Restore dialog */}
      <Dialog open={restoreTarget !== null} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <DialogContent className="max-w-[440px] bg-[#161618] border-white/[0.12] rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Restore {restoreTarget?.project.name}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-white/45 leading-relaxed">
              The archive will be extracted into a new folder inside the directory you choose. Nothing in the
              original project is touched.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <label className="text-[12px] text-white/50 mb-1.5 block font-medium">Destination directory</label>
            <Input
              value={restorePath}
              onChange={(e) => setRestorePath(e.target.value)}
              placeholder="/Users/you/restore-destination"
              className="font-mono text-[13px]"
              autoFocus
            />
            <p className="text-[11px] text-white/30 mt-1.5">
              The directory must already exist. A timestamped subfolder is created inside it.
            </p>
          </div>
          <div className="flex justify-end gap-2.5 mt-4">
            <Button variant="secondary" size="sm" onClick={() => setRestoreTarget(null)} disabled={restoreBusy} className="rounded-[10px]">
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={restoreBusy || !restorePath.trim()} className="rounded-[10px] gap-1.5 min-w-[100px]">
              {restoreBusy ? 'Restoring…' : 'Restore'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
