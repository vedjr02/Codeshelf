import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { runOsAction, type OsAction } from '@/lib/os-actions';
import { desktopOnlyResponse, isDesktopHost } from '@/lib/desktop';

const ALLOWED: OsAction[] = ['finder', 'editor', 'terminal'];

/**
 * POST /api/projects/[id]/open
 * Hands the project's folder to the desktop. The path comes from the
 * database row (scoped to the session user), never from the request body,
 * so a caller cannot point this at an arbitrary directory.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isDesktopHost()) return desktopOnlyResponse('Opening a project hands the folder to your desktop.');

    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action as OsAction | undefined;

    if (!action || !ALLOWED.includes(action)) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true, path: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const result = await runOsAction(action, project.path);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Could not complete that action' }, { status: 422 });
    }

    // Opening a project counts as using it.
    await prisma.project
      .update({ where: { id: project.id }, data: { lastOpened: new Date() } })
      .catch(() => {});

    return NextResponse.json({ ok: true, handler: result.handler, path: project.path });
  } catch (error) {
    console.error('Open action failed:', error);
    return NextResponse.json({ error: 'Could not complete that action' }, { status: 500 });
  }
}
