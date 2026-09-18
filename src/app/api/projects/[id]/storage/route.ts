import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { desktopOnlyResponse, isDesktopHost } from '@/lib/desktop';
import {
  invalidateLibraryScan,
  isDirectory,
  removeAll,
  resolveInside,
  scanProject,
} from '@/lib/reclaim';

async function loadProject(request: NextRequest, id: string) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true, path: true, name: true, size: true },
  });
  if (!project) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) };

  return { project, user };
}

/** GET — what could be freed without losing anything you wrote. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isDesktopHost()) return desktopOnlyResponse('Measuring reclaimable space reads the project folder.');

    const { id } = await params;
    const { project, error } = await loadProject(request, id);
    if (error) return error;

    if (!(await isDirectory(project.path))) {
      return NextResponse.json({ error: 'The project folder is no longer on disk.' }, { status: 410 });
    }

    const entries = await scanProject(project.path);

    return NextResponse.json({
      projectSize: Number(project.size),
      reclaimable: entries.reduce((sum, e) => sum + e.size, 0),
      entries,
    });
  } catch (err) {
    console.error('Storage scan failed:', err);
    return NextResponse.json({ error: 'Could not scan this project' }, { status: 500 });
  }
}

/** DELETE — removes the selected regenerable directories. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isDesktopHost()) return desktopOnlyResponse('Reclaiming space deletes folders on disk.');

    const { id } = await params;
    const { project, user, error } = await loadProject(request, id);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const requested: unknown = body?.paths;
    if (!Array.isArray(requested) || requested.length === 0) {
      return NextResponse.json({ error: 'Nothing selected' }, { status: 400 });
    }

    const targets: string[] = [];
    for (const relative of requested) {
      const resolved = resolveInside(project.path, relative as string);
      if (!resolved) {
        return NextResponse.json(
          { error: 'One of the selected folders is not a recognised build or cache directory.' },
          { status: 400 }
        );
      }
      targets.push(resolved);
    }

    const { freed, removed } = await removeAll(project.path, targets);

    // The stored size excludes these directories already, so it stays valid;
    // only the freshness of the row changes.
    await prisma.project.update({ where: { id: project.id }, data: { updatedAt: new Date() } }).catch(() => {});
    invalidateLibraryScan(user.id);

    return NextResponse.json({ ok: true, freed, removed });
  } catch (err) {
    console.error('Reclaim failed:', err);
    return NextResponse.json({ error: 'Could not remove those folders' }, { status: 500 });
  }
}
