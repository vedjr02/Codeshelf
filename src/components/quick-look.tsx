'use client';

import * as React from 'react';
import Link from 'next/link';
import { Code2, FolderOpen, GitBranch, ShieldPlus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScoreRing, ScoreBreakdown } from '@/components/score';
import { DotBadge } from '@/components/ui/badge';
import type { ProjectActions } from '@/components/project-actions';
import { formatBytes, formatRelativeTime, getLanguageColor, prettyPath } from '@/lib/utils';
import { gradeLabel } from '@/lib/health';
import type { ProjectSummary } from '@/types/client';

/**
 * Quick Look — press space on a selected project to see everything that
 * matters without leaving the list, and escape to dismiss. Same gesture,
 * same purpose as the Finder's.
 */
export function QuickLook({
  project,
  onClose,
  actions,
}: {
  project: ProjectSummary | null;
  onClose: () => void;
  actions: ProjectActions;
}) {
  // Space closes it again, the way Quick Look toggles.
  React.useEffect(() => {
    if (!project) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [project, onClose]);

  if (!project) return null;
  const languageColor = getLanguageColor(project.language);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-[520px] p-0">
        <div className="flex items-start gap-4 p-5 pb-4">
          <ScoreRing score={project.health.score} grade={project.health.grade} size={72} thickness={6} />

          <div className="min-w-0 flex-1 pt-1">
            <DialogTitle className="truncate text-[21px]">{project.name}</DialogTitle>
            <p className="mono mt-1 truncate text-[13px] text-ink-4" title={project.path}>
              {prettyPath(project.path)}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              <span className="font-medium">{gradeLabel(project.health.grade)}.</span> {project.health.headline}
            </p>
          </div>

          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close preview">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 border-y-[0.5px] border-line bg-surface-2 px-5 py-4 sm:grid-cols-4">
          <Fact label="Size" value={formatBytes(project.size)} />
          <Fact label="Modified" value={formatRelativeTime(project.lastModified)} />
          <Fact label="Last backup" value={formatRelativeTime(project.lastBackupAt)} />
          <Fact
            label="Branch"
            value={
              project.isGitRepo && project.gitBranch ? (
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {project.gitBranch}
                </span>
              ) : (
                'No git'
              )
            }
          />
        </div>

        {(project.language || project.framework || project.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 px-5 pt-4">
            {project.language && <DotBadge size="sm" color={languageColor}>{project.language}</DotBadge>}
            {project.framework && (
              <span className="inline-flex h-[19px] items-center rounded-full bg-surface-3 px-2 text-[12px] font-medium text-ink-2">
                {project.framework}
              </span>
            )}
            {project.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex h-[19px] items-center rounded-full px-2 text-[12px] font-medium"
                style={{ color: tag.color, backgroundColor: `color-mix(in srgb, ${tag.color} 13%, transparent)` }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="px-5 py-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-4">
            Shelf Score breakdown
          </h3>
          <ScoreBreakdown report={project.health} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t-[0.5px] border-line px-5 py-3.5">
          <Button size="sm" variant="secondary" onClick={() => void actions.openIn(project, 'finder')}>
            <FolderOpen className="h-[15px] w-[15px]" />
            Reveal
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void actions.openIn(project, 'editor')}>
            <Code2 className="h-[15px] w-[15px]" />
            Editor
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void actions.backUpNow(project)}>
            <ShieldPlus className="h-[15px] w-[15px]" />
            Back up
          </Button>
          <Button asChild size="sm" variant="primary" className="ml-auto">
            <Link href={`/projects/${project.id}`}>Open project</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.07em] text-ink-4">{label}</div>
      <div className="mt-0.5 truncate text-[14px] font-medium text-ink">{value}</div>
    </div>
  );
}
