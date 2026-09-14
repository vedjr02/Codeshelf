'use client';

import { formatBytes, formatRelativeTime, getLanguageColor } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Star, GitBranch, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    path: string;
    language?: string | null;
    framework?: string | null;
    size: number | bigint;
    lastModified?: Date | string | null;
    isGitRepo?: boolean;
    gitBranch?: string | null;
    isFavorite?: boolean;
    isArchived?: boolean;
    tags?: Array<{ id: string; name: string; color: string }>;
    backups?: Array<{ id: string; createdAt: Date | string }>;
  };
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ProjectCard({ project, onToggleFavorite, onArchive, onDelete }: ProjectCardProps) {
  const languageColor = getLanguageColor(project.language);
  const hasBackup = project.backups && project.backups.length > 0;

  return (
    <Card className="p-4 bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/projects/${project.id}`}
              className="text-[15px] font-semibold tracking-tight truncate hover:text-white transition-colors"
            >
              {project.name}
            </Link>
            {project.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />}
          </div>
          <p className="text-[11px] text-zinc-500 truncate font-mono mb-3">{project.path}</p>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {project.language && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{ backgroundColor: `${languageColor}12`, color: languageColor }}
              >
                {project.language}
              </span>
            )}
            {hasBackup && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
                Backed up
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <span>{formatBytes(project.size)}</span>
            {project.isGitRepo && project.gitBranch && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {project.gitBranch}
              </span>
            )}
            <span className="ml-auto">Modified {formatRelativeTime(project.lastModified)}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleFavorite?.(project.id)}>
              {project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
              {project.isArchived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete?.(project.id)} className="text-red-400">
              Remove from library
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}