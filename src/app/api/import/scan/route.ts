import { NextRequest, NextResponse } from 'next/server';
import { detectProject } from '@/lib/project-detector';
import { getSessionUser } from '@/lib/session';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ScanResult {
  path: string;
  name: string;
  language: string | null;
  framework: string | null;
  packageManager: string | null;
  isGitRepo: boolean;
  gitRemote: string | null;
  size: number;
  readme: string | null;
  dependencies: Array<{ name: string; version: string; type: string }>;
  devDependencies: Array<{ name: string; version: string; type: string }>;
  scripts: Array<{ name: string; command: string }>;
}

// POST /api/import/scan - Scan a folder for projects
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderPath, recursive = true, maxDepth = 3 } = await request.json();

    if (!folderPath) {
      return NextResponse.json({ error: 'Folder path is required' }, { status: 400 });
    }

    // Check if path exists
    try {
      const stats = await fs.stat(folderPath);
      if (!stats.isDirectory()) {
        return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Path does not exist or is not accessible' }, { status: 400 });
    }

    // Find all potential projects
    const foundProjects: ScanResult[] = [];

    async function scanDirectory(dirPath: string, currentDepth: number): Promise<void> {
      if (currentDepth > maxDepth) return;

      const projectIndicators = [
        'package.json',
        'requirements.txt',
        'pyproject.toml',
        'Cargo.toml',
        'go.mod',
        'pom.xml',
        'build.gradle',
        'Gemfile',
        'pubspec.yaml',
      ];

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        // Check if this directory is a project
        const hasProjectIndicator = entries.some(
          entry => entry.isFile() && projectIndicators.includes(entry.name)
        );

        const hasGit = entries.some(entry => entry.name === '.git' && entry.isDirectory());

        if (hasProjectIndicator || hasGit) {
          // Detect project details, trimmed to what the import UI needs
          const detected = await detectProject(dirPath);
          if (detected) {
            foundProjects.push({
              path: dirPath,
              name: detected.name,
              language: detected.language,
              framework: detected.framework,
              packageManager: detected.packageManager,
              isGitRepo: detected.isGitRepo,
              gitRemote: detected.gitRemote,
              size: detected.size,
              readme: detected.readme,
              dependencies: detected.dependencies,
              devDependencies: detected.devDependencies,
              scripts: detected.scripts,
            });
          }
        }

        // Scan subdirectories if recursive
        if (recursive) {
          const ignoreDirs = [
            'node_modules',
            '.git',
            '.next',
            'dist',
            'build',
            '__pycache__',
            'venv',
            '.venv',
            'target',
            'vendor',
          ];

          for (const entry of entries) {
            if (entry.isDirectory() && !ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
              await scanDirectory(path.join(dirPath, entry.name), currentDepth + 1);
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    await scanDirectory(folderPath, 0);

    return NextResponse.json({
      folderPath,
      projects: foundProjects,
      total: foundProjects.length,
    });
  } catch (error) {
    console.error('Failed to scan folder:', error);
    return NextResponse.json({ error: 'Failed to scan folder' }, { status: 500 });
  }
}
