import type { HealthReport } from '@/lib/health';

/** The project shape every client list and card receives from /api/projects. */
export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  description?: string | null;
  language?: string | null;
  framework?: string | null;
  packageManager?: string | null;
  size: number;
  lastModified?: string | null;
  lastOpened?: string | null;
  notes?: string | null;
  isGitRepo: boolean;
  gitBranch?: string | null;
  gitRemote?: string | null;
  gitStatus?: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  tags: Array<{ id: string; name: string; color: string }>;
  collections: Array<{ id: string; name: string }>;
  backups: Array<{ id: string; createdAt: string; size: number; status: string }>;
  lastBackupAt?: string | null;
  health: HealthReport;
}

export interface BackupRecord {
  id: string;
  projectId: string;
  provider: string;
  storagePath: string;
  size: number;
  fileCount: number;
  status: string;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface ReclaimEntry {
  relativePath: string;
  name: string;
  size: number;
  fileCount: number;
  reason: string;
}

/** One project's regenerable directories, as the library Storage page sees it. */
export interface ProjectReclaim {
  projectId: string;
  name: string;
  path: string;
  /** The folder is gone from disk; nothing was scanned. */
  missing: boolean;
  reclaimable: number;
  entries: ReclaimEntry[];
}

export interface LibraryReclaim {
  scannedAt: string;
  totalReclaimable: number;
  projects: ProjectReclaim[];
  fromCache?: boolean;
  /** No cached scan yet, and the caller asked not to start one. */
  pending?: boolean;
}
