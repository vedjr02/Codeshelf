import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_USER_ID = 'dev-user-id';

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
  try {
    // Get all projects for the user
    const projects = await prisma.project.findMany({
      where: { userId: DEFAULT_USER_ID },
      include: {
        tags: { include: { tag: true } },
        backups: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    // Calculate stats
    const totalProjects = projects.length;
    const totalSize = projects.reduce((sum, p) => sum + Number(p.size), 0);

    // Language distribution
    const languageMap = new Map<string, number>();
    projects.forEach(p => {
      if (p.language) {
        languageMap.set(p.language, (languageMap.get(p.language) || 0) + 1);
      }
    });
    const languages = Array.from(languageMap.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Framework distribution
    const frameworkMap = new Map<string, number>();
    projects.forEach(p => {
      if (p.framework) {
        frameworkMap.set(p.framework, (frameworkMap.get(p.framework) || 0) + 1);
      }
    });
    const frameworks = Array.from(frameworkMap.entries())
      .map(([framework, count]) => ({ framework, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recently opened (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentlyOpened = projects
      .filter(p => p.lastOpened && new Date(p.lastOpened) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.lastOpened!).getTime() - new Date(a.lastOpened!).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        language: p.language,
        framework: p.framework,
        lastOpened: p.lastOpened,
        path: p.path,
      }));

    // Recently modified
    const recentlyModified = projects
      .filter(p => p.lastModified)
      .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        language: p.language,
        framework: p.framework,
        lastModified: p.lastModified,
        path: p.path,
      }));

    // Projects needing backup (no backup in last 7 days or never backed up)
    const projectsNeedingBackup = projects
      .filter(p => {
        if (p.backups.length === 0) return true;
        const lastBackup = p.backups[0];
        if (!lastBackup) return true;
        return new Date(lastBackup.createdAt) < sevenDaysAgo;
      })
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        language: p.language,
        lastModified: p.lastModified,
        lastBackup: p.backups[0]?.createdAt || null,
      }));

    // Find duplicate groups based on git remote
    const remoteMap = new Map<string, typeof projects>();
    projects.forEach(p => {
      if (p.gitRemote) {
        if (!remoteMap.has(p.gitRemote)) {
          remoteMap.set(p.gitRemote, []);
        }
        remoteMap.get(p.gitRemote)!.push(p);
      }
    });

    const duplicateGroups = Array.from(remoteMap.entries())
      .filter(([, projs]) => projs.length > 1)
      .map(([gitRemote, projs]) => ({
        type: 'git-remote' as const,
        gitRemote,
        projects: projs.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          lastModified: p.lastModified,
        })),
        count: projs.length,
      }));

    return NextResponse.json({
      totalProjects,
      totalSize,
      languages,
      frameworks,
      recentlyOpened,
      recentlyModified,
      projectsNeedingBackup,
      duplicateGroups,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
