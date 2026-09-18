import * as fs from 'fs/promises';
import type { Dirent } from 'fs';
import * as path from 'path';
import { RECLAIMABLE_DIRECTORIES, RECLAIMABLE_REASONS } from '@/lib/health';

/**
 * Finding and removing regenerable directories.
 *
 * One project's Manage Storage panel and the library-wide Storage page run
 * the same scan, the same guards and the same delete, so a path that is
 * unsafe in one place is unsafe in both.
 */

const RECLAIMABLE = new Set<string>(RECLAIMABLE_DIRECTORIES);
const MAX_SCAN_DEPTH = 3;

export interface ReclaimEntry {
  /** Path relative to the project root — what the UI shows and sends back. */
  relativePath: string;
  name: string;
  size: number;
  fileCount: number;
  reason: string;
}

export async function measure(dir: string): Promise<{ size: number; fileCount: number }> {
  let size = 0;
  let fileCount = 0;
  let entries: Dirent[];

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { size, fileCount };
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const nested = await measure(full);
      size += nested.size;
      fileCount += nested.fileCount;
    } else if (entry.isFile()) {
      try {
        const stats = await fs.lstat(full);
        size += stats.size;
        fileCount += 1;
      } catch {
        // Unreadable file — it simply doesn't count toward the total.
      }
    }
  }

  return { size, fileCount };
}

/** Walks the project looking for regenerable directories, shallowly. */
async function walk(root: string, dir: string, depth: number, found: ReclaimEntry[]): Promise<void> {
  if (depth > MAX_SCAN_DEPTH) return;

  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);

    if (entry.name === '.git') continue;

    if (RECLAIMABLE.has(entry.name)) {
      const { size, fileCount } = await measure(full);
      if (size > 0) {
        found.push({
          relativePath: path.relative(root, full),
          name: entry.name,
          size,
          fileCount,
          reason: RECLAIMABLE_REASONS[entry.name] ?? 'Regenerable output',
        });
      }
      // Don't descend into something we already counted whole.
      continue;
    }

    await walk(root, full, depth + 1, found);
  }
}

/** Every regenerable directory inside one project, largest first. */
export async function scanProject(root: string): Promise<ReclaimEntry[]> {
  const entries: ReclaimEntry[] = [];
  await walk(root, root, 0, entries);
  entries.sort((a, b) => b.size - a.size);
  return entries;
}

/** True when the path is a readable directory. */
export async function isDirectory(target: string): Promise<boolean> {
  try {
    const stats = await fs.stat(target);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolves a caller-supplied relative path and proves it stays inside the
 * project, and that its final segment is a name we know is regenerable.
 * Returns null for anything else — `..`, an absolute path, `src`, the root.
 */
export function resolveInside(root: string, relative: string): string | null {
  if (typeof relative !== 'string' || relative.length === 0) return null;
  if (path.isAbsolute(relative)) return null;

  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relative);

  if (target === resolvedRoot) return null;
  if (!target.startsWith(resolvedRoot + path.sep)) return null;
  if (!RECLAIMABLE.has(path.basename(target))) return null;

  return target;
}

/** Removes the given already-resolved directories and reports what was freed. */
export async function removeAll(
  root: string,
  targets: string[]
): Promise<{ freed: number; removed: string[] }> {
  let freed = 0;
  const removed: string[] = [];

  for (const target of targets) {
    const { size } = await measure(target);
    await fs.rm(target, { recursive: true, force: true });
    freed += size;
    removed.push(path.relative(root, target));
  }

  return { freed, removed };
}

/* ------------------------------------------------------------------
   Library-wide scan
   ------------------------------------------------------------------ */

export interface ProjectReclaim {
  projectId: string;
  name: string;
  path: string;
  /** Missing folder — scanned to nothing, and the UI says why. */
  missing: boolean;
  reclaimable: number;
  entries: ReclaimEntry[];
}

export interface LibraryReclaim {
  scannedAt: string;
  totalReclaimable: number;
  projects: ProjectReclaim[];
}

/**
 * Walking every project is slow enough that a page refresh should not pay
 * for it twice. The result is cached per user for a few minutes, and any
 * delete drops the entry so the next read is honest.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: LibraryReclaim }>();

export function invalidateLibraryScan(userId: string): void {
  cache.delete(userId);
}

export function getCachedLibraryScan(userId: string): LibraryReclaim | null {
  const hit = cache.get(userId);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return hit.value;
}

export async function scanLibrary(
  userId: string,
  projects: { id: string; name: string; path: string }[]
): Promise<LibraryReclaim> {
  const results: ProjectReclaim[] = [];

  // Sequential on purpose: these are disk walks, and running twenty at once
  // makes the whole thing slower, not faster.
  for (const project of projects) {
    if (!(await isDirectory(project.path))) {
      results.push({
        projectId: project.id,
        name: project.name,
        path: project.path,
        missing: true,
        reclaimable: 0,
        entries: [],
      });
      continue;
    }

    const entries = await scanProject(project.path);
    results.push({
      projectId: project.id,
      name: project.name,
      path: project.path,
      missing: false,
      reclaimable: entries.reduce((sum, entry) => sum + entry.size, 0),
      entries,
    });
  }

  results.sort((a, b) => b.reclaimable - a.reclaimable);

  const value: LibraryReclaim = {
    scannedAt: new Date().toISOString(),
    totalReclaimable: results.reduce((sum, project) => sum + project.reclaimable, 0),
    projects: results,
  };

  cache.set(userId, { at: Date.now(), value });
  return value;
}
