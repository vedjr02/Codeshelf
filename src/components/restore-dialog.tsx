'use client';

import * as React from 'react';
import { FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, IconInput } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { formatExact } from '@/lib/utils';

/**
 * Restoring is the one moment where a backup manager has to be completely
 * unambiguous, so the dialog states plainly that it extracts into a *new*
 * timestamped folder and never writes over the original.
 */
export function RestoreDialog({
  open,
  onOpenChange,
  backup,
  projectName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backup: { id: string; createdAt: string } | null;
  projectName: string;
}) {
  const { success, error: toastError } = useToast();
  const [destination, setDestination] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // Clear the field whenever a different snapshot is chosen.
  React.useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setDestination(''));
      return () => cancelAnimationFrame(frame);
    }
  }, [open, backup?.id]);

  const restore = async () => {
    if (!backup || !destination.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: backup.id, destination: destination.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Check the destination path and try again.');
      success('Snapshot restored', `Extracted to ${payload.path}`);
      onOpenChange(false);
    } catch (err) {
      toastError('Restore failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Restore {projectName}</DialogTitle>
          <DialogDescription>
            {backup ? `Snapshot from ${formatExact(backup.createdAt)}.` : null} The archive is extracted into a new
            timestamped folder inside the directory you choose. The original project is never modified.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <Field
            label="Destination directory"
            htmlFor="restore-destination"
            hint="The directory must already exist. A subfolder named after the project and the snapshot time is created inside it."
          >
            <IconInput
              id="restore-destination"
              icon={<FolderOpen />}
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="/Users/you/Restored"
              className="mono"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') void restore();
              }}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void restore()}
            disabled={busy || !destination.trim()}
            className="min-w-[96px]"
          >
            {busy ? 'Restoring…' : 'Restore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
