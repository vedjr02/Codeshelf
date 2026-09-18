'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, Minus, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { formatBytes, formatExact, formatRelativeTime, cn } from '@/lib/utils';
import type { BackupRecord } from '@/types/client';

/**
 * A project's snapshots as a timeline rather than a list.
 *
 * The point is the *change* between snapshots: a backup that suddenly gained
 * 300 MB or lost half its files is worth knowing about, and a flat row of
 * dates hides exactly that.
 */
export function BackupTimeline({
  backups,
  onRestore,
  onDelete,
  className,
}: {
  backups: BackupRecord[];
  onRestore: (backup: BackupRecord) => void;
  onDelete: (backup: BackupRecord) => void;
  className?: string;
}) {
  // Newest first for reading; deltas are measured against the older neighbour.
  const ordered = React.useMemo(
    () => [...backups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [backups]
  );

  if (ordered.length === 0) {
    return (
      <EmptyState
        title="No snapshots yet"
        description="A snapshot is a zip of your source with node_modules, build output and caches left out. Take one and it appears here."
        className={className}
      />
    );
  }

  const completed = ordered.filter((b) => b.status === 'completed');
  const span = spanOf(ordered);

  return (
    <div className={className}>
      {/* Density strip: where the snapshots sit across the whole span. */}
      {span && completed.length > 1 && (
        <div className="mb-6">
          <div className="relative h-8">
            <div className="absolute inset-x-0 top-1/2 h-[0.5px] -translate-y-1/2 bg-line" />
            {completed.map((backup) => {
              const t = new Date(backup.createdAt).getTime();
              const pct = ((t - span.from) / Math.max(1, span.to - span.from)) * 100;
              return (
                <span
                  key={backup.id}
                  title={formatExact(backup.createdAt)}
                  className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                  style={{ left: `${Math.min(99.5, Math.max(0.5, pct))}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[12px] text-ink-4">
            <span>{new Date(span.from).toLocaleDateString()}</span>
            <span>{new Date(span.to).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      <ol className="relative space-y-0">
        {/* The spine. */}
        <span aria-hidden="true" className="absolute left-[5.25px] top-2 bottom-2 w-[0.5px] bg-line" />

        {ordered.map((backup, index) => {
          const older = ordered.slice(index + 1).find((b) => b.status === 'completed');
          const delta = backup.status === 'completed' && older ? backup.size - older.size : null;
          const failed = backup.status === 'failed';

          return (
            <li key={backup.id} className="relative pl-6">
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-0 top-[18px] h-[11px] w-[11px] rounded-full border-2 border-surface',
                  failed ? 'bg-bad' : backup.status === 'completed' ? 'bg-accent' : 'bg-warn'
                )}
              />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-[0.5px] border-line py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-ink" title={formatExact(backup.createdAt)}>
                      {formatRelativeTime(backup.createdAt)}
                    </span>
                    {index === 0 && !failed && (
                      <Badge tone="accent" size="sm">
                        Latest
                      </Badge>
                    )}
                    {failed && (
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

                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px] text-ink-3">
                    <span className="tabular">{formatBytes(backup.size)}</span>
                    <span className="text-ink-5">·</span>
                    <span className="tabular">{backup.fileCount.toLocaleString()} files</span>
                    {delta !== null && <Delta bytes={delta} />}
                  </div>

                  {failed && backup.error && (
                    <p className="mt-1 text-[13px] leading-relaxed text-bad">{backup.error}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {backup.status === 'completed' && (
                    <Button variant="secondary" size="sm" onClick={() => onRestore(backup)}>
                      <Undo2 className="h-[14px] w-[14px]" />
                      Restore
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(backup)}
                    aria-label={`Delete the snapshot from ${formatExact(backup.createdAt)}`}
                    className="text-ink-4 hover:bg-bad-tint hover:text-bad"
                  >
                    <Trash2 className="h-[15px] w-[15px]" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function spanOf(backups: BackupRecord[]): { from: number; to: number } | null {
  const times = backups.map((b) => new Date(b.createdAt).getTime()).filter((t) => !Number.isNaN(t));
  if (times.length < 2) return null;
  return { from: Math.min(...times), to: Math.max(...times) };
}

/** Size change against the previous snapshot, with its direction. */
function Delta({ bytes }: { bytes: number }) {
  if (Math.abs(bytes) < 1024) {
    return (
      <span className="inline-flex items-center gap-1 text-ink-4">
        <Minus className="h-3 w-3" />
        unchanged
      </span>
    );
  }
  const grew = bytes > 0;
  return (
    <span className={cn('inline-flex items-center gap-1 tabular', grew ? 'text-warn' : 'text-good')}>
      {grew ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {formatBytes(Math.abs(bytes))}
    </span>
  );
}
