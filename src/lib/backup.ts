import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
// archiver v8 is ESM-only and exports classes, not a callable factory
import { ZipArchive } from 'archiver';

const execAsync = promisify(exec);

export interface BackupOptions {
  projectId: string;
  projectPath: string;
  outputPath: string;
  excludePatterns?: string[];
  onProgress?: (progress: number, currentFile?: string) => void;
}

export interface RestoreOptions {
  backupPath: string;
  outputPath: string;
  onProgress?: (progress: number) => void;
}

const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/__pycache__/**',
  '**/.venv/**',
  '**/venv/**',
  '**/env/**',
  '**/.env',
  '**/target/**',
  '**/vendor/**',
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/*.log',
  '**/.cache/**',
];

export async function createBackup(options: BackupOptions): Promise<{ size: number; fileCount: number }> {
  const { projectPath, outputPath, excludePatterns = DEFAULT_EXCLUDE_PATTERNS, onProgress } = options;

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const output = createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    let fileCount = 0;
    let total = 0;
    let resolved = false;

    const archive = new ZipArchive({ zlib: { level: 6 } });

    archive.on('entry', (entry: { name: string }) => {
      fileCount++;
      if (onProgress && fileCount % 5 === 0) {
        onProgress(Math.min(99, Math.round((fileCount / Math.max(1, total)) * 100)), entry.name);
      }
    });

    archive.on('error', (err: Error) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    output.on('error', (err: Error) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    output.on('close', async () => {
      if (resolved) return;
      resolved = true;
      try {
        const stats = await fs.stat(outputPath);
        resolve({ size: stats.size, fileCount });
      } catch (err) {
        reject(err as Error);
      }
    });

    // Count the glob matches once so progress has a denominator
    archive.on('progress', (data: { entries?: { total?: number } }) => {
      if (data.entries && data.entries.total) {
        total = data.entries.total;
      }
    });

    // Add files with exclusions
    try {
      archive.glob('**/*', {
        cwd: projectPath,
        ignore: excludePatterns,
        dot: true,
      });
    } catch (err) {
      if (!resolved) {
        resolved = true;
        reject(err as Error);
      }
      return;
    }

    archive.pipe(output);
    archive.finalize().then(() => {
      if (onProgress) onProgress(100);
    });
  });
}

export async function restoreBackup(options: RestoreOptions): Promise<void> {
  const { backupPath, outputPath, onProgress } = options;

  await fs.mkdir(outputPath, { recursive: true });

  // Use unzip command for extraction
  await execAsync(`unzip -o "${backupPath}" -d "${outputPath}"`);

  if (onProgress) {
    onProgress(100);
  }
}

export async function getBackupInfo(backupPath: string): Promise<{ size: number; fileCount: number }> {
  const stats = await fs.stat(backupPath);

  // Get file count from zip
  const { stdout } = await execAsync(`unzip -l "${backupPath}" | tail -1`);
  const match = stdout.match(/(\d+)\s+files/);
  const fileCount = match ? parseInt(match[1], 10) : 0;

  return {
    size: stats.size,
    fileCount,
  };
}

export async function deleteBackup(backupPath: string): Promise<void> {
  await fs.unlink(backupPath);
}

export async function ensureBackupDirectory(basePath: string): Promise<void> {
  await fs.mkdir(basePath, { recursive: true });
}