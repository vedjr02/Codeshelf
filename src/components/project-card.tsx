'use client';

import { formatBytes, formatRelativeTime, getLanguageColor, getFrameworkColor } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  Star,
  GitBranch,
  ExternalLink,
  Archive,
  MoreHorizontal,
  FolderSync,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';
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
    gitRemote?: string | null;
    gitStatus?: string | null;
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
  const frameworkColor = getFrameworkColor(project.framework);
  const hasBackup = project.backups && project.backups.length > 0;

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:bg-white/[0.075] bg-white/[0.06] border-white/[0.13] hover:border-white/[0.19]">
      <div className="flex flex-col p-6 min-h-[200px]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2.5">
              {/* Language icon tile */}
              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${languageColor}14` }}
              >
                <FolderOpen className="w-[22px] h-[22px]" style={{ color: languageColor }} />
              </div>

              <Link
                href={`/projects/${project.id}`}
                className="text-[18px] font-semibold tracking-tight hover:text-white/80 transition-colors truncate"
              >
                {project.name}
              </Link>
              {project.isFavorite && (
                <Star className="w-[18px] h-[18px] text-[#ffd60a] fill-[#ffd60a] shrink-0" />
              )}
              {project.isArchived && (
                <Archive className="w-[18px] h-[18px] text-white/40 shrink-0" />
              )}
            </div>

            <p className="text-[12px] text-[#86868b] truncate font-mono mb-3.5">
              {project.path}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              {project.language && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium"
                  style={{ backgroundColor: `${languageColor}14`, color: languageColor }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: languageColor }} />
                  {project.language}
                </span>
              )}
              {project.framework && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium"
                  style={{
                    backgroundColor: frameworkColor ? `${frameworkColor}10` : 'rgba(255,255,255,0.06)',
                    color: frameworkColor ? frameworkColor : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {project.framework}
                </span>
              )}
              {hasBackup && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#30d158]/10 text-[#30d158]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Backed up
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex items-center gap-5 text-[12px] text-white/40 pt-4 border-t border-white/[0.09]">
            <span className="tabular-nums">{formatBytes(project.size)}</span>
            {project.isGitRepo && project.gitBranch && (
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                {project.gitBranch}
              </span>
            )}
            {project.gitRemote && (
              <a
                href={project.gitRemote}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-white/60 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Remote
              </a>
            )}
            <span className="ml-auto">Modified {formatRelativeTime(project.lastModified)}</span>
          </div>

          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3.5">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2.5 py-1 text-[11px] rounded-full"
                  style={{
                    backgroundColor: `${tag.color}18`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="text-[12px] text-white/35">
                  +{project.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-5 right-5 flex items-center gap-1.5 shrink-0">
          {!hasBackup && (
            <span title="Needs backup" className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[#ff9f0a]/10 text-[#ff9f0a]/80">
              <FolderSync className="w-3.5 h-3.5" />
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white">
                <MoreHorizontal className="w-[18px] h-[18px]" />
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
              <DropdownMenuItem
                onClick={() => onDelete?.(project.id)}
                className="text-[#ff453a] focus:text-[#ff453a]"
              >
                Remove from library
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}