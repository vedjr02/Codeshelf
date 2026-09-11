export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  language?: string;
  framework?: string;
  packageManager?: string;
  size: number;
  lastModified?: Date;
  lastOpened?: Date;
  readme?: string;
  notes?: string;

  // Git info
  isGitRepo: boolean;
  gitBranch?: string;
  gitRemote?: string;
  gitStatus?: string;
  gitLastCommit?: Date;
  gitCommitCount?: number;

  // Status
  isFavorite: boolean;
  isArchived: boolean;
  isPinned: boolean;
  status: 'active' | 'archived' | 'needs-attention';

  // Detection
  hasPackageJson: boolean;
  hasRequirements: boolean;
  hasCargo: boolean;
  hasGoMod: boolean;
  hasPubspec: boolean;
  hasGemfile: boolean;
  hasPomXml: boolean;

  // Parsed data
  dependencies?: Dependency[];
  devDependencies?: Dependency[];
  scripts?: ProjectScript[];
  fileStructure?: FileNode[];

  // Relations
  tags: Tag[];
  collections: Collection[];
  backups: Backup[];

  createdAt: Date;
  updatedAt: Date;
}

export interface Dependency {
  name: string;
  version: string;
  type?: 'production' | 'development' | 'optional';
}

export interface ProjectScript {
  name: string;
  command: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  projectCount?: number;
}

export interface Backup {
  id: string;
  projectId: string;
  provider: 'local' | 'google-drive' | 's3';
  storagePath: string;
  size: number;
  fileCount: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  error?: string;
  checksum?: string;
  excludedPaths?: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface ProjectImport {
  path: string;
  name: string;
  language?: string;
  framework?: string;
  packageManager?: string;
  isGitRepo: boolean;
  gitRemote?: string;
  size: number;
}

export interface SearchResult {
  projects: Project[];
  total: number;
  query: string;
  filters: SearchFilters;
}

export interface SearchFilters {
  language?: string;
  framework?: string;
  status?: string;
  tags?: string[];
  collection?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface DashboardStats {
  totalProjects: number;
  totalSize: number;
  languages: { language: string; count: number }[];
  frameworks: { framework: string; count: number }[];
  recentlyOpened: Project[];
  recentlyModified: Project[];
  projectsNeedingBackup: Project[];
  duplicateGroups: DuplicateGroup[];
}

export interface DuplicateGroup {
  id: string;
  type: 'git-remote' | 'structure' | 'content';
  projects: Project[];
  similarity: number;
}

export interface BackupProgress {
  backupId: string;
  status: string;
  progress: number;
  currentFile?: string;
  filesProcessed: number;
  totalFiles: number;
}
