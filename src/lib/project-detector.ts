import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

interface DetectionResult {
  name: string;
  language: string | null;
  framework: string | null;
  packageManager: string | null;
  isGitRepo: boolean;
  gitRemote: string | null;
  gitBranch: string | null;
  gitStatus: string | null;
  size: number;
  hasPackageJson: boolean;
  hasRequirements: boolean;
  hasCargo: boolean;
  hasGoMod: boolean;
  hasPubspec: boolean;
  hasGemfile: boolean;
  hasPomXml: boolean;
  dependencies: Array<{ name: string; version: string; type: string }>;
  devDependencies: Array<{ name: string; version: string; type: string }>;
  scripts: Array<{ name: string; command: string }>;
  readme: string | null;
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.dart': 'Dart',
  '.scala': 'Scala',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.clj': 'Clojure',
  '.hs': 'Haskell',
  '.lua': 'Lua',
  '.r': 'R',
  '.php': 'PHP',
  '.c': 'C',
  '.cpp': 'C++',
  '.h': 'C',
  '.hpp': 'C++',
  '.cs': 'C#',
  '.sh': 'Shell',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
};

const FRAMEWORK_INDICATORS: Record<string, { files: string[]; framework: string }> = {
  'next': { files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], framework: 'Next' },
  'react': { files: [], framework: 'React' },
  'vue': { files: ['vue.config.js', 'vite.config.js'], framework: 'Vue' },
  'nuxt': { files: ['nuxt.config.js', 'nuxt.config.ts'], framework: 'Nuxt' },
  'svelte': { files: ['svelte.config.js'], framework: 'Svelte' },
  'angular': { files: ['angular.json'], framework: 'Angular' },
  'django': { files: ['manage.py', 'settings.py'], framework: 'Django' },
  'flask': { files: [], framework: 'Flask' },
  'fastapi': { files: [], framework: 'FastAPI' },
  'rails': { files: ['Gemfile'], framework: 'Rails' },
  'laravel': { files: ['artisan'], framework: 'Laravel' },
  'spring': { files: ['pom.xml', 'build.gradle'], framework: 'Spring' },
  'express': { files: [], framework: 'Express' },
  'nestjs': { files: ['nest-cli.json'], framework: 'Nest' },
  'actix': { files: [], framework: 'Actix' },
  'rocket': { files: [], framework: 'Rocket' },
  'gin': { files: [], framework: 'Gin' },
};

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;

  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'target', 'vendor', 'venv', '.venv', 'env', '.env'];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name)) {
          size += await getDirectorySize(fullPath);
        }
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        } catch {
          // Skip files we can't read
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return size;
}

function detectLanguageFromFiles(files: string[], extensions: Record<string, number>): string | null {
  // Check for config files first
  if (files.includes('package.json')) {
    const hasTs = files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    return hasTs ? 'TypeScript' : 'JavaScript';
  }
  if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
    return 'Python';
  }
  if (files.includes('Cargo.toml')) return 'Rust';
  if (files.includes('go.mod')) return 'Go';
  if (files.includes('Gemfile')) return 'Ruby';
  if (files.includes('pubspec.yaml')) return 'Dart';
  if (files.includes('pom.xml') || files.includes('build.gradle')) return 'Java';

  // Fall back to most common extension
  const sorted = Object.entries(extensions).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    const ext = sorted[0][0];
    return LANGUAGE_EXTENSIONS[ext] || null;
  }

  return null;
}

function detectFramework(files: string[], dependencies: string[]): string | null {
  // Check for framework-specific config files
  for (const [, indicator] of Object.entries(FRAMEWORK_INDICATORS)) {
    if (indicator.files.some(f => files.includes(f))) {
      return indicator.framework;
    }
  }

  // Check dependencies
  if (dependencies.includes('next')) return 'Next';
  if (dependencies.includes('react')) return 'React';
  if (dependencies.includes('vue')) return 'Vue';
  if (dependencies.includes('nuxt')) return 'Nuxt';
  if (dependencies.includes('svelte')) return 'Svelte';
  if (dependencies.includes('@angular/core')) return 'Angular';
  if (dependencies.includes('express')) return 'Express';
  if (dependencies.includes('@nestjs/core')) return 'Nest';
  if (dependencies.includes('fastify')) return 'Fastify';
  if (dependencies.includes('django')) return 'Django';
  if (dependencies.includes('flask')) return 'Flask';
  if (dependencies.includes('fastapi')) return 'FastAPI';
  if (dependencies.includes('rails')) return 'Rails';
  if (dependencies.includes('actix-web')) return 'Actix';
  if (dependencies.includes('rocket')) return 'Rocket';
  if (dependencies.includes('gin')) return 'Gin';

  return null;
}

function getGitInfo(projectPath: string): { branch: string | null; remote: string | null; status: string | null } {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();

    let remote: string | null = null;
    try {
      remote = execSync('git remote get-url origin', { cwd: projectPath, encoding: 'utf-8' }).trim();
    } catch {
      // No remote
    }

    let status = 'clean';
    try {
      const statusOutput = execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8' });
      if (statusOutput.trim()) {
        status = 'dirty';
      }
    } catch {
      // Ignore
    }

    return { branch, remote, status };
  } catch {
    return { branch: null, remote: null, status: null };
  }
}

export async function detectProject(projectPath: string): Promise<DetectionResult | null> {
  try {
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) return null;
  } catch {
    return null;
  }

  const name = path.basename(projectPath);
  const files: string[] = [];
  const extensions: Record<string, number> = {};
  const rootFiles: string[] = [];

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        rootFiles.push(entry.name);
        files.push(entry.name);

        const ext = path.extname(entry.name);
        if (ext) {
          extensions[ext] = (extensions[ext] || 0) + 1;
        }
      }
    }
  } catch {
    // Can't read directory
  }

  // Check for git
  let isGitRepo = false;
  try {
    await fs.access(path.join(projectPath, '.git'));
    isGitRepo = true;
  } catch {
    // Not a git repo
  }

  const gitInfo = isGitRepo ? getGitInfo(projectPath) : { branch: null, remote: null, status: null };

  // Parse package files
  let dependencies: Array<{ name: string; version: string; type: string }> = [];
  let devDependencies: Array<{ name: string; version: string; type: string }> = [];
  let scripts: Array<{ name: string; command: string }> = [];
  let packageManager: string | null = null;

  const hasPackageJson = rootFiles.includes('package.json');
  const hasRequirements = rootFiles.includes('requirements.txt') || rootFiles.includes('setup.py') || rootFiles.includes('pyproject.toml');
  const hasCargo = rootFiles.includes('Cargo.toml');
  const hasGoMod = rootFiles.includes('go.mod');
  const hasPubspec = rootFiles.includes('pubspec.yaml');
  const hasGemfile = rootFiles.includes('Gemfile');
  const hasPomXml = rootFiles.includes('pom.xml') || rootFiles.includes('build.gradle');

  if (hasPackageJson) {
    try {
      const content = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(content);

      if (pkg.dependencies) {
        dependencies = Object.entries(pkg.dependencies).map(([name, version]) => ({
          name,
          version: version as string,
          type: 'production',
        }));
      }

      if (pkg.devDependencies) {
        devDependencies = Object.entries(pkg.devDependencies).map(([name, version]) => ({
          name,
          version: version as string,
          type: 'development',
        }));
      }

      if (pkg.scripts) {
        scripts = Object.entries(pkg.scripts).map(([name, command]) => ({
          name,
          command: command as string,
        }));
      }

      // Detect package manager
      if (rootFiles.includes('pnpm-lock.yaml')) packageManager = 'pnpm';
      else if (rootFiles.includes('yarn.lock')) packageManager = 'yarn';
      else if (rootFiles.includes('bun.lockb')) packageManager = 'bun';
      else packageManager = 'npm';
    } catch {
      // Invalid package.json
    }
  }

  // Detect language
  const language = detectLanguageFromFiles(rootFiles, extensions);

  // Detect framework
  const depNames = dependencies.map(d => d.name);
  const framework = detectFramework(rootFiles, depNames);

  // Read README
  let readme: string | null = null;
  const readmeFiles = ['README.md', 'README.txt', 'README', 'readme.md'];
  for (const readmeFile of readmeFiles) {
    try {
      readme = await fs.readFile(path.join(projectPath, readmeFile), 'utf-8');
      break;
    } catch {
      // Try next
    }
  }

  // Calculate size
  const size = await getDirectorySize(projectPath);

  return {
    name,
    language,
    framework,
    packageManager,
    isGitRepo,
    gitRemote: gitInfo.remote,
    gitBranch: gitInfo.branch,
    gitStatus: gitInfo.status,
    size,
    hasPackageJson,
    hasRequirements,
    hasCargo,
    hasGoMod,
    hasPubspec,
    hasGemfile,
    hasPomXml,
    dependencies,
    devDependencies,
    scripts,
    readme,
  };
}
