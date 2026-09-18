'use client';

import * as React from 'react';
import Link from 'next/link';
import { GitBranch, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DotBadge } from '@/components/ui/badge';
import { ScoreChip } from '@/components/score';
import { ProjectMenu, type ProjectActions } from '@/components/project-actions';
import { formatBytes, formatRelativeTime, getLanguageColor, prettyPath, cn } from '@/lib/utils';
import type { ProjectSummary } from '@/types/client';

interface ProjectCardProps {
  project: ProjectSummary;
  actions: ProjectActions;
  onRequestDelete: (project: ProjectSummary) => void;
  /** Quick Look: selecting a card and pressing space peeks at it. */
  selected?: boolean;
  onSelect?: (project: ProjectSummary) => void;
  onPeek?: (project: ProjectSummary) => void;
}

/**
 * Grid tile. The hierarchy is deliberate: name, then the one number that
 * says whether the project is safe, then the facts you scan for. Everything
 * else waits behind the menu.
 */
export function ProjectCard({
  project,
  actions,
  onRequestDelete,
  selected,
  onSelect,
  onPeek,
}: ProjectCardProps) {
  const languageColor = getLanguageColor(project.language);

  return (
    <Card
      interactive
      onClick={() => onSelect?.(project)}
      onKeyDown={(event) => {
        if (event.key === ' ' && onPeek) {
          event.preventDefault();
          onPeek(project);
        }
      }}
      tabIndex={0}
      className={cn(
        'group relative flex flex-col p-5 outline-none',
        selected && 'border-accent ring-[3px] ring-accent-tint'
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: languageColor }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/projects/${project.id}`}
              onClick={(event) => event.stopPropagation()}
              className="truncate text-[16px] font-semibold tracking-[-0.018em] text-ink hover:text-accent-ink"
            >
              {project.name}
            </Link>
            {project.isFavorite && (
              <Star className="h-[13px] w-[13px] shrink-0 fill-warn text-warn" aria-label="Favourite" />
            )}
          </div>
          <p className="mono mt-0.5 truncate text-[12.5px] text-ink-4" title={project.path}>
            {prettyPath(project.path)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ScoreChip score={project.health.score} grade={project.health.grade} />
          <div className="opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
            <ProjectMenu project={project} actions={actions} onRequestDelete={onRequestDelete} />
          </div>
        </div>
      </div>

      {/* The next action for this project, in words. */}
      <p className="mt-3.5 line-clamp-2 text-[14px] leading-relaxed text-ink-3">{project.health.headline}</p>

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {project.language && <DotBadge size="sm" color={languageColor}>{project.language}</DotBadge>}
          {project.framework && (
            <span className="inline-flex h-[19px] items-center rounded-full bg-surface-3 px-2 text-[12px] font-medium text-ink-2">
              {project.framework}
            </span>
          )}
          {project.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex h-[19px] items-center rounded-full px-2 text-[12px] font-medium"
              style={{
                color: tag.color,
                backgroundColor: `color-mix(in srgb, ${tag.color} 13%, transparent)`,
              }}
            >
              {tag.name}
            </span>
          ))}
          {project.tags.length > 2 && (
            <span className="text-[12px] text-ink-4">+{project.tags.length - 2}</span>
          )}
        </div>

        <div className="mt-3.5 flex items-center gap-3 border-t-[0.5px] border-line pt-3 text-[12.5px] text-ink-4">
          <span className="tabular">{formatBytes(project.size)}</span>
          {project.isGitRepo && project.gitBranch && (
            <span className="flex min-w-0 items-center gap-1">
              <GitBranch className="h-3 w-3 shrink-0" />
              <span className="truncate">{project.gitBranch}</span>
              {project.gitStatus === 'dirty' && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" title="Uncommitted changes" />
              )}
            </span>
          )}
          <span className="ml-auto shrink-0 tabular">{formatRelativeTime(project.lastModified)}</span>
        </div>
      </div>
    </Card>
  );
}
