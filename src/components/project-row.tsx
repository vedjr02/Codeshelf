'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Star } from 'lucide-react';
import { ScoreChip } from '@/components/score';
import { ProjectMenu, type ProjectActions } from '@/components/project-actions';
import { formatBytes, formatRelativeTime, getLanguageColor, prettyPath, cn } from '@/lib/utils';
import type { ProjectSummary } from '@/types/client';

/**
 * List view. Denser than the grid and aligned in columns, so a library of a
 * hundred projects can be scanned by size, branch or date without reading
 * every tile.
 */
export function ProjectRow({
  project,
  actions,
  onRequestDelete,
  selected,
  onSelect,
  onPeek,
}: {
  project: ProjectSummary;
  actions: ProjectActions;
  onRequestDelete: (project: ProjectSummary) => void;
  selected?: boolean;
  onSelect?: (project: ProjectSummary) => void;
  onPeek?: (project: ProjectSummary) => void;
}) {
  const router = useRouter();
  const languageColor = getLanguageColor(project.language);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(project)}
      onDoubleClick={() => router.push(`/projects/${project.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          router.push(`/projects/${project.id}`);
        } else if (event.key === ' ' && onPeek) {
          event.preventDefault();
          onPeek(project);
        }
      }}
      className={cn(
        'group flex items-center gap-3 px-3.5 py-2.5 outline-none',
        'border-b-[0.5px] border-line last:border-b-0',
        'transition-colors duration-100',
        selected ? 'bg-accent-tint' : 'hover:bg-surface-3 focus-visible:bg-surface-3'
      )}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: languageColor }}
      />

      <span className="min-w-0 flex-[2]">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium text-ink">{project.name}</span>
          {project.isFavorite && <Star className="h-3 w-3 shrink-0 fill-warn text-warn" />}
        </span>
        <span className="mono block truncate text-[12px] text-ink-4">{prettyPath(project.path)}</span>
      </span>

      <span className="hidden w-[110px] shrink-0 truncate text-[13.5px] text-ink-3 lg:block">
        {project.language ?? '—'}
      </span>

      <span className="hidden w-[130px] shrink-0 items-center gap-1 text-[13.5px] text-ink-3 xl:flex">
        {project.isGitRepo && project.gitBranch ? (
          <>
            <GitBranch className="h-3 w-3 shrink-0" />
            <span className="truncate">{project.gitBranch}</span>
            {project.gitStatus === 'dirty' && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" title="Uncommitted changes" />
            )}
          </>
        ) : (
          '—'
        )}
      </span>

      <span className="hidden w-[76px] shrink-0 text-right text-[13.5px] tabular text-ink-3 sm:block">
        {formatBytes(project.size)}
      </span>

      <span className="hidden w-[90px] shrink-0 text-right text-[13.5px] tabular text-ink-3 md:block">
        {formatRelativeTime(project.lastModified)}
      </span>

      <span className="w-[54px] shrink-0">
        <ScoreChip score={project.health.score} grade={project.health.grade} />
      </span>

      <span className="shrink-0 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        <ProjectMenu project={project} actions={actions} onRequestDelete={onRequestDelete} />
      </span>
    </div>
  );
}

/** One sortable header cell. Declared at module scope so it keeps identity. */
function SortHead({
  label,
  sortKey,
  className,
  sortBy,
  onSort,
}: {
  label: string;
  sortKey?: string;
  className?: string;
  sortBy: string;
  onSort: (key: string) => void;
}) {
  if (!sortKey) return <span className={className}>{label}</span>;
  const active = sortBy === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn('text-left transition-colors hover:text-ink', active && 'font-semibold text-ink', className)}
    >
      {label}
    </button>
  );
}

/** Column headers matching ProjectRow, so the list reads as a table. */
export function ProjectRowHeader({
  sortBy,
  onSort,
}: {
  sortBy: string;
  onSort: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b-[0.5px] border-line bg-surface-2 px-3.5 py-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-4">
      <span className="w-2 shrink-0" />
      <SortHead label="Name" sortKey="name" className="min-w-0 flex-[2]" sortBy={sortBy} onSort={onSort} />
      <span className="hidden w-[110px] shrink-0 lg:block">Language</span>
      <span className="hidden w-[130px] shrink-0 xl:block">Branch</span>
      <SortHead
        label="Size"
        sortKey="size"
        className="hidden w-[76px] shrink-0 text-right sm:block"
        sortBy={sortBy}
        onSort={onSort}
      />
      <SortHead
        label="Modified"
        sortKey="lastModified"
        className="hidden w-[90px] shrink-0 text-right md:block"
        sortBy={sortBy}
        onSort={onSort}
      />
      <SortHead label="Score" sortKey="health" className="w-[54px] shrink-0" sortBy={sortBy} onSort={onSort} />
      <span className="w-7 shrink-0" />
    </div>
  );
}
