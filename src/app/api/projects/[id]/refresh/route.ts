import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { detectProject } from '@/lib/project-detector';
import { desktopOnlyResponse, isDesktopHost } from '@/lib/desktop';
import * as fs from 'fs/promises';

/**
 * POST /api/projects/[id]/refresh
 * Re-reads the folder on disk: git branch and status, size, dependencies,
 * scripts, README. Detection previously ran only at import, so a project's
 * metadata drifted from reality the moment you committed anything.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isDesktopHost()) return desktopOnlyResponse('Refreshing re-reads the folder on disk.');

    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const project = await prisma.project.findFirst({ where: { id, userId: user.id } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    try {
      const stats = await fs.stat(project.path);
      if (!stats.isDirectory()) throw new Error('not a directory');
    } catch {
      return NextResponse.json(
        { error: 'The project folder is no longer at this path.', missing: true },
        { status: 410 }
      );
    }

    const detected = await detectProject(project.path);
    if (!detected) {
      return NextResponse.json({ error: 'Could not read that folder' }, { status: 422 });
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        language: detected.language,
        framework: detected.framework,
        packageManager: detected.packageManager,
        size: BigInt(detected.size),
        isGitRepo: detected.isGitRepo,
        gitBranch: detected.gitBranch,
        gitRemote: detected.gitRemote,
        gitStatus: detected.gitStatus,
        readme: detected.readme,
        hasPackageJson: detected.hasPackageJson,
        hasRequirements: detected.hasRequirements,
        hasCargo: detected.hasCargo,
        hasGoMod: detected.hasGoMod,
        hasPubspec: detected.hasPubspec,
        hasGemfile: detected.hasGemfile,
        hasPomXml: detected.hasPomXml,
        dependencies: JSON.stringify(detected.dependencies),
        devDependencies: JSON.stringify(detected.devDependencies),
        scripts: JSON.stringify(detected.scripts),
        lastModified: new Date(),
      },
      select: { id: true, size: true, gitBranch: true, gitStatus: true, language: true, framework: true },
    });

    return NextResponse.json({
      ok: true,
      project: { ...updated, size: Number(updated.size) },
    });
  } catch (error) {
    console.error('Refresh failed:', error);
    return NextResponse.json({ error: 'Could not refresh this project' }, { status: 500 });
  }
}
