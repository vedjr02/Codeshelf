'use client';

import * as React from 'react';
import { HardDrive, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { formatBytes, cn } from '@/lib/utils';
import type { ReclaimEntry } from '@/types/client';

interface StorageResponse {
  projectSize: number;
  reclaimable: number;
  entries: ReclaimEntry[];
}

/**
 * Manage Storage, for one project.
 *
 * Dependency trees and build output are the reason a 4 MB project reports
 * 900 MB on disk. This finds those directories, says why each one is safe to
 * remove, and removes only the ones you tick. Nothing you wrote is touched.
 */
export function StoragePanel({ projectId, onChanged }: { projectId: string; onChanged?: () => void }) {
  const { success, error: toastError } = useToast();
  const [data, setData] = React.useState<StorageResponse | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirming, setConfirming] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const scan = React.useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/storage`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Could not scan this project');
      setData(payload as StorageResponse);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not scan this project');
    } finally {
      setScanning(false);
    }
  }, [projectId]);

  const toggle = (relativePath: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(relativePath)) next.delete(relativePath);
      else next.add(relativePath);
      return next;
    });
  };

  const selectedEntries = (data?.entries ?? []).filter((entry) => selected.has(entry.relativePath));
  const selectedBytes = selectedEntries.reduce((sum, entry) => sum + entry.size, 0);

  const remove = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/storage`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: Array.from(selected) }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Could not remove those folders');
      success(`Freed ${formatBytes(payload.freed ?? selectedBytes)}`, `${payload.removed?.length ?? selected.size} folders removed.`);
      onChanged?.();
      await scan();
    } catch (err) {
      toastError('Could not free that space', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setRemoving(false);
      setConfirming(false);
    }
  };

  /* ---- Before the first scan ---------------------------------------- */
  if (!data && !scanning && !error) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-3">
            <HardDrive className="h-[19px] w-[19px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15.5px] font-semibold tracking-[-0.015em]">Find reclaimable space</h3>
            <p className="mt-1 text-[14.5px] leading-relaxed text-ink-3">
              Looks for dependency trees, build output and caches inside this project — everything a tool can
              rebuild. Nothing is removed until you choose it.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void scan()} className="shrink-0">
            Scan project
          </Button>
        </div>
      </Card>
    );
  }

  if (scanning && !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-[14.5px] text-ink-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          Measuring folders on disk…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <ErrorState message={error} retry={() => void scan()} />
      </Card>
    );
  }

  if (!data) return null;

  const total = data.projectSize + data.reclaimable;
  const reclaimShare = total > 0 ? (data.reclaimable / total) * 100 : 0;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-4">Reclaimable</div>
              <div className="mt-1 text-[32px] font-semibold tabular leading-none tracking-[-0.025em] text-ink">
                {formatBytes(data.reclaimable)}
              </div>
              <p className="mt-2 text-[14px] text-ink-3">
                {formatBytes(data.projectSize)} of source · {formatBytes(total)} on disk
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void scan()} disabled={scanning}>
              <RefreshCw className={cn('h-[14px] w-[14px]', scanning && 'animate-spin')} />
              Rescan
            </Button>
          </div>

          {/* Source versus regenerable, to scale. */}
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="bg-accent transition-[width] duration-700 ease-[var(--ease-standard)]"
              style={{ width: `${100 - reclaimShare}%` }}
              title={`Source: ${formatBytes(data.projectSize)}`}
            />
            <div
              className="bg-warn transition-[width] duration-700 ease-[var(--ease-standard)]"
              style={{ width: `${reclaimShare}%` }}
              title={`Reclaimable: ${formatBytes(data.reclaimable)}`}
            />
          </div>
          <div className="mt-2.5 flex gap-5 text-[13px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-accent" />
              Your source
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-warn" />
              Regenerable
            </span>
          </div>
        </div>

        {data.entries.length === 0 ? (
          <div className="border-t-[0.5px] border-line">
            <EmptyState
              title="Nothing to reclaim"
              description="No dependency trees, build output or caches were found inside this project."
            />
          </div>
        ) : (
          <>
            <div className="border-t-[0.5px] border-line">
              {data.entries.map((entry) => {
                const checked = selected.has(entry.relativePath);
                return (
                  <label
                    key={entry.relativePath}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 border-b-[0.5px] border-line px-5 py-3 last:border-b-0',
                      'transition-colors duration-100',
                      checked ? 'bg-accent-tint' : 'hover:bg-surface-3'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(entry.relativePath)}
                      className="h-[15px] w-[15px] shrink-0 accent-[var(--color-accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="mono block truncate text-[14px] text-ink">{entry.relativePath}</span>
                      <span className="block truncate text-[13px] text-ink-4">{entry.reason}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[14px] font-medium tabular text-ink">{formatBytes(entry.size)}</span>
                      <span className="block text-[12.5px] tabular text-ink-4">
                        {entry.fileCount.toLocaleString()} files
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t-[0.5px] border-line bg-surface-2 px-5 py-3.5">
              <button
                type="button"
                onClick={() =>
                  setSelected((prev) =>
                    prev.size === data.entries.length
                      ? new Set()
                      : new Set(data.entries.map((entry) => entry.relativePath))
                  )
                }
                className="text-[14px] text-ink-3 underline-offset-[3px] transition-colors hover:text-ink hover:underline"
              >
                {selected.size === data.entries.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-[14px] tabular text-ink-3">
                {selected.size > 0 ? `${formatBytes(selectedBytes)} selected` : 'Nothing selected'}
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto"
                disabled={selected.size === 0 || removing}
                onClick={() => setConfirming(true)}
              >
                <Trash2 className="h-[14px] w-[14px]" />
                Free {selected.size > 0 ? formatBytes(selectedBytes) : 'space'}
              </Button>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${selected.size === 1 ? 'this folder' : `these ${selected.size} folders`}?`}
        description={`This permanently removes ${formatBytes(selectedBytes)} from disk.`}
        detail={
          <>
            <p className="mb-2">
              These are build output, caches and installed dependencies — your own files are not in them. You can
              rebuild each one with the project&apos;s usual install or build command.
            </p>
            <ul className="mono space-y-0.5 text-[13px] text-ink-3">
              {selectedEntries.slice(0, 6).map((entry) => (
                <li key={entry.relativePath} className="truncate">
                  {entry.relativePath}
                </li>
              ))}
              {selectedEntries.length > 6 && <li>+{selectedEntries.length - 6} more</li>}
            </ul>
          </>
        }
        confirmLabel="Delete folders"
        destructive
        loading={removing}
        onConfirm={remove}
      />
    </>
  );
}
