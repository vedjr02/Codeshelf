import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { desktopOnlyResponse, isDesktopHost } from '@/lib/desktop';
import {
  getCachedLibraryScan,
  invalidateLibraryScan,
  removeAll,
  resolveInside,
  scanLibrary,
} from '@/lib/reclaim';

/**
 * Library-wide Manage Storage.
 *
 * GET returns every regenerable directory across every project. A full walk
 * is slow, so a recent result is served from cache unless `?refresh=1` asks
 * for a fresh one; `?cached=1` returns nothing rather than starting a scan,
 * which is what the Overview tile uses so it never blocks the page.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isDesktopHost()) return desktopOnlyResponse('Measuring reclaimable space reads your project folders.');

    if (!isDesktopHost()) return desktopOnlyResponse('Measuring reclaimable space reads your project folders.');

    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const refresh = request.nextUrl.searchParams.get('refresh') === '1';
    const cachedOnly = request.nextUrl.searchParams.get('cached') === '1';

    if (!refresh) {
      const cached = getCachedLibraryScan(user.id);
      if (cached) return NextResponse.json({ ...cached, fromCache: true });
      if (cachedOnly) return NextResponse.json({ pending: true });
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id, isArchived: false },
      select: { id: true, name: true, path: true },
      orderBy: { name: 'asc' },
    });

    const result = await scanLibrary(user.id, projects);
    return NextResponse.json({ ...result, fromCache: false });
  } catch (err) {
    console.error('Library storage scan failed:', err);
    return NextResponse.json({ error: 'Could not scan your library' }, { status: 500 });
  }
}

interface DeleteSelection {
  projectId: string;
  paths: string[];
}

/**
 * DELETE — removes selected directories across several projects at once.
 * Every path is re-resolved against its own project here; nothing the client
 * sends is trusted.
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isDesktopHost()) return desktopOnlyResponse('Reclaiming space deletes folders on disk.');

    if (!isDesktopHost()) return desktopOnlyResponse('Reclaiming space deletes folders on disk.');

    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const selections: unknown = body?.selections;
    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json({ error: 'Nothing selected' }, { status: 400 });
    }

    const ids = selections
      .map((selection) => (selection as DeleteSelection)?.projectId)
      .filter((id): id is string => typeof id === 'string');

    const projects = await prisma.project.findMany({
      where: { id: { in: ids }, userId: user.id },
      select: { id: true, path: true },
    });
    const byId = new Map(projects.map((project) => [project.id, project]));

    // Resolve everything before removing anything, so a bad path in the last
    // selection doesn't leave the first half already deleted.
    const plan: { projectId: string; root: string; targets: string[] }[] = [];
    for (const raw of selections as DeleteSelection[]) {
      const project = byId.get(raw?.projectId);
      if (!project) {
        return NextResponse.json({ error: 'One of those projects is not in your library.' }, { status: 404 });
      }
      if (!Array.isArray(raw?.paths) || raw.paths.length === 0) continue;

      const targets: string[] = [];
      for (const relative of raw.paths) {
        const resolved = resolveInside(project.path, relative);
        if (!resolved) {
          return NextResponse.json(
            { error: 'One of the selected folders is not a recognised build or cache directory.' },
            { status: 400 }
          );
        }
        targets.push(resolved);
      }
      plan.push({ projectId: project.id, root: project.path, targets });
    }

    if (plan.length === 0) {
      return NextResponse.json({ error: 'Nothing selected' }, { status: 400 });
    }

    let freed = 0;
    let removedCount = 0;
    for (const step of plan) {
      const result = await removeAll(step.root, step.targets);
      freed += result.freed;
      removedCount += result.removed.length;
      await prisma.project
        .update({ where: { id: step.projectId }, data: { updatedAt: new Date() } })
        .catch(() => {});
    }

    invalidateLibraryScan(user.id);

    return NextResponse.json({ ok: true, freed, removed: removedCount, projects: plan.length });
  } catch (err) {
    console.error('Library reclaim failed:', err);
    return NextResponse.json({ error: 'Could not remove those folders' }, { status: 500 });
  }
}
