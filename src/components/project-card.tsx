'use client';

import { formatBytes, formatRelativeTime, getLanguageColor, getFrameworkColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Star,
  GitBranch,
  ExternalLink,
  Archive,
  MoreHorizontal,
  FolderSync,
  ShieldCheck,
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
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-[2px] hover:bg-white/[0.05] bg-white/[0.03] border-white/[0.07] hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/20">
      {/* Top accent — language-colored hairline */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-60 transition-all duration-300"
        style={{
          background: project.language
            ? `linear-gradient(90deg, transparent, ${languageColor}, transparent)`
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        }}
      />

      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {/* Language icon tile */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mr-0.5 transition-transform group-hover:scale-105"
              style={{ backgroundColor: `${languageColor}14` }}
            >
              <span className="w-2.5 h-2.5 rounded-full lang-dot" style={{ color: languageColor, backgroundColor: languageColor }} />
            </div>

            <Link
              href={`/projects/${project.id}`}
              className="text-[15px] font-semibold tracking-tight hover:text-white/80 transition-colors truncate"
            >
              {project.name}
            </Link>
            {project.isFavorite && (
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
            )}
            {project.isArchived && (
              <Archive className="w-4 h-4 text-white/40 shrink-0" />
            )}
          </div>

          <p className="text-[11px] text-white/35 truncate font-mono mb-3 pl-[10.5rem] -ml-[2.5rem] max-w-full hidden sm:block md:block lg:block xl:block">
            {project.path}
          </p>
          <p className="text-[11px] text-white/35 truncate font-mono mb-3 sm:hidden">
            {project.path}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {project.language && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{ backgroundColor: `${languageColor}12`, color: languageColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: languageColor }} />
                {project.language}
              </span>
            )}
            {project.framework && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{
                  backgroundColor: frameworkColor ? `${frameworkColor}10` : 'rgba(255,255,255,0.06)',
                  color: frameworkColor ? frameworkColor : 'rgba(255,255,255,0.6)',
                }}
              >
                {project.framework}
              </span>
            )}
            {hasBackup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                Backed up
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-white/35">
            <span className="tabular-nums">{formatBytes(project.size)}</span>
            {project.isGitRepo && project.gitBranch && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {project.gitBranch}
              </span>
            )}
            {project.gitRemote && (
              <a
                href={project.gitRemote}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-white/60 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Remote
              </a>
            )}
            <span className="ml-auto">Modified {formatRelativeTime(project.lastModified)}</span>
          </div>

          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-[10.5px] rounded-full"
                  style={{
                    backgroundColor: `${tag.color}18`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="text-[11px] text-white/35">
                  +{project.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!hasBackup && (
            <span title="Needs backup" className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-orange-500/10 text-orange-400/80">
              <FolderSync className="w-3 h-3" />
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white">
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
              <DropdownMenuItem
                onClick={() => onDelete?.(project.id)}
                className="text-red-400 focus:text-red-400"
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