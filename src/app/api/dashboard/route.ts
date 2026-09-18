import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { loadProjects, serializeProject } from '@/lib/project-query';
import { gradeFor, type HealthGrade } from '@/lib/health';

const WEEK = 7 * 86_400_000;

/**
 * GET /api/dashboard
 * One payload for the whole overview. The dashboard's job is to answer
 * "what needs me today", so the response leads with the Shelf Score and the
 * specific projects dragging it down rather than a wall of counters.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [rows, backups] = await Promise.all([
      loadProjects(user.id),
      prisma.backup.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, size: true, status: true, createdAt: true },
      }),
    ]);

    const all = rows.map(serializeProject);
    const active = all.filter((p) => !p.isArchived);

    const totalProjects = active.length;
    const totalSize = active.reduce((sum, p) => sum + p.size, 0);

    /* ---- Library score: the average, and how the spread looks --------- */
    const libraryScore =
      totalProjects === 0
        ? 100
        : Math.round(active.reduce((sum, p) => sum + p.health.score, 0) / totalProjects);

    const gradeCounts: Record<HealthGrade, number> = { excellent: 0, good: 0, fair: 0, 'at-risk': 0 };
    active.forEach((p) => {
      gradeCounts[p.health.grade] += 1;
    });

    /* ---- Needs attention: lowest scores, with the one next step ------- */
    const attention = [...active]
      .filter((p) => p.health.score < 85)
      .sort((a, b) => a.health.score - b.health.score)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        language: p.language,
        score: p.health.score,
        grade: p.health.grade,
        headline: p.health.headline,
        lastBackupAt: p.lastBackupAt,
      }));

    /* ---- Recently opened / modified ---------------------------------- */
    const recent = [...active]
      .filter((p) => p.lastOpened)
      .sort((a, b) => new Date(b.lastOpened!).getTime() - new Date(a.lastOpened!).getTime())
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        language: p.language,
        lastOpened: p.lastOpened,
        score: p.health.score,
      }));

    const recentlyModified = [...active]
      .filter((p) => p.lastModified)
      .sort((a, b) => new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime())
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        language: p.language,
        lastModified: p.lastModified,
        gitStatus: p.gitStatus,
        score: p.health.score,
      }));

    /* ---- Composition ------------------------------------------------- */
    const tally = (values: Array<string | null>) => {
      const map = new Map<string, number>();
      values.forEach((v) => {
        if (v) map.set(v, (map.get(v) ?? 0) + 1);
      });
      return Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    const languages = tally(active.map((p) => p.language));
    const frameworks = tally(active.map((p) => p.framework));

    /* ---- Backups: totals plus a 12-week activity series -------------- */
    const completed = backups.filter((b) => b.status === 'completed');
    const now = Date.now();
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const end = now - i * WEEK;
      const start = end - WEEK;
      return {
        weekStart: new Date(start).toISOString(),
        count: completed.filter((b) => {
          const t = new Date(b.createdAt).getTime();
          return t >= start && t < end;
        }).length,
      };
    }).reverse();

    const backupSummary = {
      total: completed.length,
      failed: backups.filter((b) => b.status === 'failed').length,
      totalSize: completed.reduce((sum, b) => sum + Number(b.size), 0),
      lastBackupAt: completed[0]?.createdAt ?? null,
      weeks,
    };

    /* ---- Duplicates: several local copies of one remote -------------- */
    const byRemote = new Map<string, typeof active>();
    active.forEach((p) => {
      if (!p.gitRemote) return;
      const list = byRemote.get(p.gitRemote) ?? [];
      list.push(p);
      byRemote.set(p.gitRemote, list);
    });

    const duplicateGroups = Array.from(byRemote.entries())
      .filter(([, group]) => group.length > 1)
      .map(([gitRemote, group]) => ({
        gitRemote,
        count: group.length,
        wastedSize: group.slice(1).reduce((sum, p) => sum + p.size, 0),
        projects: group.map((p) => ({ id: p.id, name: p.name, path: p.path, size: p.size })),
      }))
      .sort((a, b) => b.wastedSize - a.wastedSize);

    return NextResponse.json({
      totalProjects,
      archivedCount: all.length - active.length,
      totalSize,
      libraryScore,
      libraryGrade: gradeFor(libraryScore),
      gradeCounts,
      protectedCount: active.filter((p) => p.lastBackupAt).length,
      attention,
      recent,
      recentlyModified,
      languages,
      frameworks,
      backupSummary,
      duplicateGroups,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
