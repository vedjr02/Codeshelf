'use client';

import * as React from 'react';
import {
  Archive,
  ArchiveRestore,
  Code2,
  Copy,
  FolderOpen,
  MoreHorizontal,
  RefreshCw,
  ShieldPlus,
  Star,
  StarOff,
  Terminal,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { notifyLibraryChanged } from '@/components/library-context';
import type { ProjectSummary } from '@/types/client';

export type OsTarget = 'finder' | 'editor' | 'terminal';

/** Only the fields these actions actually change. */
export type ProjectPatch = Partial<Pick<ProjectSummary, 'isFavorite' | 'isArchived' | 'notes'>>;

interface ActionCallbacks {
  /** Called with the patch that was applied, so lists can update in place. */
  onPatched?: (id: string, patch: ProjectPatch) => void;
  onRemoved?: (id: string) => void;
  onRefreshed?: (id: string) => void;
}

/**
 * Every project mutation in one hook, so the projects grid, the list, the
 * detail page and the palette all behave identically and report errors the
 * same way.
 */
export function useProjectActions({ onPatched, onRemoved, onRefreshed }: ActionCallbacks = {}) {
  const { success, error: toastError } = useToast();
  const [pending, setPending] = React.useState<string | null>(null);

  const patch = React.useCallback(
    async (project: ProjectSummary, body: ProjectPatch, label: string) => {
      try {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Could not ${label}`);
        onPatched?.(project.id, body);
        notifyLibraryChanged();
        return true;
      } catch (err) {
        toastError(`Could not ${label}`, err instanceof Error ? err.message : 'Please try again.');
        return false;
      }
    },
    [onPatched, toastError]
  );

  const toggleFavorite = React.useCallback(
    (project: ProjectSummary) =>
      patch(project, { isFavorite: !project.isFavorite }, 'update favourites'),
    [patch]
  );

  const toggleArchive = React.useCallback(
    async (project: ProjectSummary) => {
      const ok = await patch(project, { isArchived: !project.isArchived }, 'change archive state');
      if (ok) {
        success(project.isArchived ? 'Moved back to the library' : 'Archived', project.name);
      }
      return ok;
    },
    [patch, success]
  );

  const remove = React.useCallback(
    async (project: ProjectSummary) => {
      setPending(project.id);
      try {
        const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Could not remove this project');
        onRemoved?.(project.id);
        notifyLibraryChanged();
        success('Removed from CodeShelf', 'The folder on disk was not touched.');
        return true;
      } catch (err) {
        toastError('Could not remove project', err instanceof Error ? err.message : 'Please try again.');
        return false;
      } finally {
        setPending(null);
      }
    },
    [onRemoved, success, toastError]
  );

  const openIn = React.useCallback(
    async (project: ProjectSummary, target: OsTarget) => {
      setPending(project.id);
      try {
        const res = await fetch(`/api/projects/${project.id}/open`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: target }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not open that');
        success(`Opened in ${data.handler}`, project.name);
        return true;
      } catch (err) {
        toastError('Could not open it', err instanceof Error ? err.message : 'Please try again.');
        return false;
      } finally {
        setPending(null);
      }
    },
    [success, toastError]
  );

  const backUpNow = React.useCallback(
    async (project: ProjectSummary) => {
      setPending(project.id);
      try {
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Backup failed');
        success('Snapshot created', project.name);
        onRefreshed?.(project.id);
        notifyLibraryChanged();
        return true;
      } catch (err) {
        toastError('Backup failed', err instanceof Error ? err.message : 'Please try again.');
        return false;
      } finally {
        setPending(null);
      }
    },
    [success, toastError, onRefreshed]
  );

  const refresh = React.useCallback(
    async (project: ProjectSummary) => {
      setPending(project.id);
      try {
        const res = await fetch(`/api/projects/${project.id}/refresh`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not refresh');
        success('Refreshed from disk', `${project.name} — git state and size re-read.`);
        onRefreshed?.(project.id);
        notifyLibraryChanged();
        return true;
      } catch (err) {
        toastError('Could not refresh', err instanceof Error ? err.message : 'Please try again.');
        return false;
      } finally {
        setPending(null);
      }
    },
    [success, toastError, onRefreshed]
  );

  const copyPath = React.useCallback(
    async (project: ProjectSummary) => {
      try {
        await navigator.clipboard.writeText(project.path);
        success('Path copied');
      } catch {
        toastError('Could not copy', 'Your browser blocked clipboard access.');
      }
    },
    [success, toastError]
  );

  return { pending, toggleFavorite, toggleArchive, remove, openIn, backUpNow, refresh, copyPath };
}

export type ProjectActions = ReturnType<typeof useProjectActions>;

/**
 * The project's action menu. One definition used by every surface, so
 * "Reveal in Finder" is always in the same place.
 */
export function ProjectMenu({
  project,
  actions,
  onRequestDelete,
  align = 'end',
  trigger,
}: {
  project: ProjectSummary;
  actions: ProjectActions;
  onRequestDelete: (project: ProjectSummary) => void;
  align?: 'start' | 'end';
  trigger?: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${project.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem onSelect={() => void actions.openIn(project, 'finder')}>
          <FolderOpen />
          Reveal in Finder
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void actions.openIn(project, 'editor')}>
          <Code2 />
          Open in editor
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void actions.openIn(project, 'terminal')}>
          <Terminal />
          Open in terminal
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void actions.copyPath(project)}>
          <Copy />
          Copy path
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => void actions.backUpNow(project)}>
          <ShieldPlus />
          Back up now
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void actions.refresh(project)}>
          <RefreshCw />
          Refresh from disk
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => void actions.toggleFavorite(project)}>
          {project.isFavorite ? <StarOff /> : <Star />}
          {project.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void actions.toggleArchive(project)}>
          {project.isArchived ? <ArchiveRestore /> : <Archive />}
          {project.isArchived ? 'Move to library' : 'Archive'}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onSelect={() => onRequestDelete(project)}>
          <Trash2 />
          Remove from CodeShelf
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
