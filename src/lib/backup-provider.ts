// Backup Provider Interface
// Allows adding new cloud storage providers (Google Drive, S3, etc.)

export interface BackupProvider {
  name: string;
  type: 'local' | 'google-drive' | 's3' | 'dropbox';
  upload(sourcePath: string, destinationPath: string, onProgress?: (progress: number) => void): Promise<{ size: number; fileCount: number }>;
  download(sourcePath: string, destinationPath: string, onProgress?: (progress: number) => void): Promise<void>;
  delete(path: string): Promise<void>;
  list?(): Promise<Array<{ path: string; size: number; createdAt: Date }>>;
  authenticate?(): Promise<boolean>;
  isAuthenticated?(): boolean;
}

// Local Storage Provider (Default)
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  '.env',
  'target',
  'vendor',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '.cache',
];

export class LocalBackupProvider implements BackupProvider {
  name = 'Local Storage';
  type = 'local' as const;
  private basePath: string;

  constructor(basePath: string = process.env.BACKUP_STORAGE_PATH || '/tmp/codeshelf-backups') {
    this.basePath = basePath;
  }

  async upload(
    sourcePath: string,
    destinationPath: string,
    onProgress?: (progress: number) => void
  ): Promise<{ size: number; fileCount: number }> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });

    return new Promise((resolve, reject) => {
      const output = createWriteStream(destinationPath);
      // archiver v8 is ESM-only and exports classes, not a callable factory
      const { ZipArchive } = require('archiver');
      const archive = new ZipArchive({ zlib: { level: 6 } });

      let fileCount = 0;

      output.on('close', () => {
        resolve({ size: archive.pointer(), fileCount });
      });

      archive.on('error', reject);

      archive.on('entry', () => {
        fileCount++;
        if (onProgress && fileCount % 10 === 0) {
          onProgress(Math.min(95, fileCount / 100 * 100));
        }
      });

      archive.pipe(output);

      // Add files with exclusions
      archive.glob('**/*', {
        cwd: sourcePath,
        ignore: DEFAULT_EXCLUDE_PATTERNS,
        dot: true,
      });

      archive.finalize().then(() => {
        if (onProgress) onProgress(100);
      });
    });
  }

  async download(
    sourcePath: string,
    destinationPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    await fs.mkdir(destinationPath, { recursive: true });
    await execAsync(`unzip -o "${sourcePath}" -d "${destinationPath}"`);
    if (onProgress) onProgress(100);
  }

  async delete(path: string): Promise<void> {
    await fs.unlink(path);
  }

  async list(): Promise<Array<{ path: string; size: number; createdAt: Date }>> {
    const files = await fs.readdir(this.basePath);
    const results = [];

    for (const file of files) {
      if (!file.endsWith('.zip')) continue;

      const fullPath = path.join(this.basePath, file);
      const stats = await fs.stat(fullPath);

      results.push({
        path: fullPath,
        size: stats.size,
        createdAt: stats.birthtime,
      });
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

// Provider Factory
export function getBackupProvider(type: string, config?: Record<string, any>): BackupProvider {
  switch (type) {
    case 'local':
      return new LocalBackupProvider(config?.basePath);
    case 'google-drive':
      // Future: return new GoogleDriveProvider(config);
      throw new Error('Google Drive provider not yet implemented');
    case 's3':
      // Future: return new S3Provider(config);
      throw new Error('S3 provider not yet implemented');
    default:
      return new LocalBackupProvider();
  }
}
