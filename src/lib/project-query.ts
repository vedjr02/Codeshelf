import { prisma } from '@/lib/prisma';
import { computeHealth, type HealthReport } from '@/lib/health';
import type { EvaluableProject } from '@/lib/smart-rules';

/** The include shape every list endpoint uses, so responses stay identical. */
export const projectListInclude = {
  tags: { include: { tag: true } },
  collections: { include: { collection: true } },
  backups: { orderBy: { createdAt: 'desc' as const }, take: 1 },
} as const;

type RawProject = Awaited<ReturnType<typeof loadProjects>>[number];

export async function loadProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: projectListInclude,
  });
}

export interface SerializedProject {
  id: string;
  name: string;
  path: string;
  description: string | null;
  language: string | null;
  framework: string | null;
  packageManager: string | null;
  size: number;
  lastModified: Date | null;
  lastOpened: Date | null;
  notes: string | null;
  isGitRepo: boolean;
  gitBranch: string | null;
  gitRemote: string | null;
  gitStatus: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  tags: Array<{ id: string; name: string; color: string }>;
  collections: Array<{ id: string; name: string }>;
  backups: Array<{ id: string; createdAt: Date; size: number; status: string }>;
  lastBackupAt: Date | null;
  health: HealthReport;
}

/**
 * Turns a Prisma row into the JSON the client consumes: BigInt flattened,
 * join tables unwrapped, and the Shelf Score computed once on the server so
 * every view agrees on it.
 */
export function serializeProject(p: RawProject): SerializedProject {
  const lastBackup = p.backups.find((b) => b.status === 'completed') ?? p.backups[0] ?? null;
  const tags = p.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color }));
  const collections = p.collections.map((c) => ({ id: c.collection.id, name: c.collection.name }));

  const health = computeHealth({
    isGitRepo: p.isGitRepo,
    gitRemote: p.gitRemote,
    gitStatus: p.gitStatus,
    readme: p.readme,
    notes: p.notes,
    size: p.size,
    lastModified: p.lastModified,
    lastBackupAt: lastBackup?.status === 'completed' ? lastBackup.createdAt : null,
    tagCount: tags.length,
    collectionCount: collections.length,
  });

  return {
    id: p.id,
    name: p.name,
    path: p.path,
    description: p.description,
    language: p.language,
    framework: p.framework,
    packageManager: p.packageManager,
    size: Number(p.size),
    lastModified: p.lastModified,
    lastOpened: p.lastOpened,
    notes: p.notes,
    isGitRepo: p.isGitRepo,
    gitBranch: p.gitBranch,
    gitRemote: p.gitRemote,
    gitStatus: p.gitStatus,
    isFavorite: p.isFavorite,
    isArchived: p.isArchived,
    tags,
    collections,
    backups: p.backups.map((b) => ({
      id: b.id,
      createdAt: b.createdAt,
      size: Number(b.size),
      status: b.status,
    })),
    lastBackupAt: lastBackup?.status === 'completed' ? lastBackup.createdAt : null,
    health,
  };
}

/** Adapter for the smart-rule evaluator. */
export function toEvaluable(p: SerializedProject): EvaluableProject {
  return {
    language: p.language,
    framework: p.framework,
    isGitRepo: p.isGitRepo,
    gitRemote: p.gitRemote,
    gitStatus: p.gitStatus,
    isFavorite: p.isFavorite,
    isArchived: p.isArchived,
    size: p.size,
    lastModified: p.lastModified,
    lastBackupAt: p.lastBackupAt,
    tagNames: p.tags.map((t) => t.name),
    collectionNames: p.collections.map((c) => c.name),
    healthScore: p.health.score,
  };
}
