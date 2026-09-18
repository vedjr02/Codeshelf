import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { loadProjects, serializeProject, toEvaluable } from '@/lib/project-query';
import { parseRules, matchesRules } from '@/lib/smart-rules';

/**
 * GET /api/search — the one query behind the command palette.
 *
 * Understands scoped terms the way Spotlight does, so you can type what you
 * mean instead of picking filters from menus:
 *
 *   lang:typescript          language
 *   fw:next                  framework
 *   tag:client               tag name
 *   in:work                  collection name
 *   is:favourite|dirty|risky|unprotected|archived
 *
 * Anything left over is matched fuzzily against name, path, language and tags.
 */

const SCOPE_PATTERN = /\b(lang|language|fw|framework|tag|in|is)\s*:\s*([^\s]+)/gi;

interface Scopes {
  language?: string;
  framework?: string;
  tag?: string;
  collection?: string;
  flags: string[];
}

function parseScopes(raw: string): { text: string; scopes: Scopes } {
  const scopes: Scopes = { flags: [] };
  let match: RegExpExecArray | null;
  SCOPE_PATTERN.lastIndex = 0;

  while ((match = SCOPE_PATTERN.exec(raw)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].toLowerCase();
    if (key === 'lang' || key === 'language') scopes.language = value;
    else if (key === 'fw' || key === 'framework') scopes.framework = value;
    else if (key === 'tag') scopes.tag = value;
    else if (key === 'in') scopes.collection = value;
    else if (key === 'is') scopes.flags.push(value);
  }

  const text = raw.replace(SCOPE_PATTERN, ' ').replace(/\s+/g, ' ').trim();
  return { text, scopes };
}

/**
 * Subsequence match with a score, so "csh" finds "CodeShelf" and an exact
 * prefix still wins over a scattered match.
 */
function fuzzyScore(needle: string, haystack: string): number {
  if (!needle) return 1;
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();

  if (h === n) return 1000;
  if (h.startsWith(n)) return 800 - h.length;

  const wordStart = h.split(/[\s\-_./]+/).some((word) => word.startsWith(n));
  if (wordStart) return 600 - h.length;

  const index = h.indexOf(n);
  if (index !== -1) return 400 - index;

  // Subsequence: every character in order, rewarded for staying close.
  let hi = 0;
  let gaps = 0;
  let matched = 0;
  for (const char of n) {
    const found = h.indexOf(char, hi);
    if (found === -1) return 0;
    gaps += found - hi;
    hi = found + 1;
    matched += 1;
  }
  if (matched !== n.length) return 0;
  return Math.max(1, 200 - gaps * 4);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const raw = (new URL(request.url).searchParams.get('q') || '').trim();
    const { text, scopes } = parseScopes(raw);
    const hasQuery = raw.length > 0;

    const [rows, collections, tags, smart] = await Promise.all([
      loadProjects(user.id),
      prisma.collection.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
      prisma.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true, color: true } }),
      prisma.smartCollection.findMany({ where: { userId: user.id } }),
    ]);

    let projects = rows.map(serializeProject);

    const wantsArchived = scopes.flags.includes('archived');
    projects = projects.filter((p) => (wantsArchived ? p.isArchived : !p.isArchived));

    if (scopes.language) {
      projects = projects.filter((p) => (p.language ?? '').toLowerCase().includes(scopes.language!));
    }
    if (scopes.framework) {
      projects = projects.filter((p) => (p.framework ?? '').toLowerCase().includes(scopes.framework!));
    }
    if (scopes.tag) {
      projects = projects.filter((p) => p.tags.some((t) => t.name.toLowerCase().includes(scopes.tag!)));
    }
    if (scopes.collection) {
      projects = projects.filter((p) =>
        p.collections.some((c) => c.name.toLowerCase().includes(scopes.collection!))
      );
    }

    for (const flag of scopes.flags) {
      if (flag === 'favourite' || flag === 'favorite' || flag === 'fav') {
        projects = projects.filter((p) => p.isFavorite);
      } else if (flag === 'dirty') {
        projects = projects.filter((p) => p.gitStatus === 'dirty');
      } else if (flag === 'unprotected' || flag === 'unbacked') {
        projects = projects.filter((p) => !p.lastBackupAt);
      } else if (flag === 'risky' || flag === 'at-risk') {
        projects = projects.filter((p) => p.health.grade === 'at-risk' || p.health.grade === 'fair');
      }
    }

    // Rank: fuzzy relevance first, then the more neglected project, then recency.
    const ranked = projects
      .map((p) => {
        const nameScore = fuzzyScore(text, p.name);
        const pathScore = fuzzyScore(text, p.path) * 0.4;
        const metaScore =
          Math.max(
            fuzzyScore(text, p.language ?? ''),
            fuzzyScore(text, p.framework ?? ''),
            ...p.tags.map((t) => fuzzyScore(text, t.name))
          ) * 0.3;
        return { project: p, score: Math.max(nameScore, pathScore, metaScore) };
      })
      .filter((entry) => !text || entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const at = a.project.lastOpened ?? a.project.lastModified;
        const bt = b.project.lastOpened ?? b.project.lastModified;
        return new Date(bt ?? 0).getTime() - new Date(at ?? 0).getTime();
      })
      .slice(0, 12)
      .map(({ project }) => ({
        id: project.id,
        name: project.name,
        path: project.path,
        language: project.language,
        framework: project.framework,
        gitStatus: project.gitStatus,
        score: project.health.score,
        grade: project.health.grade,
        lastBackupAt: project.lastBackupAt,
      }));

    const filterByName = <T extends { name: string }>(list: T[]) =>
      (!text ? list : list.filter((item) => fuzzyScore(text, item.name) > 0)).slice(0, 5);

    const smartResults = filterByName(
      smart.map((s) => {
        const rules = parseRules(s.rules);
        return {
          id: s.id,
          name: s.name,
          icon: s.icon,
          count: projects.filter((p) => matchesRules(toEvaluable(p), rules)).length,
        };
      })
    );

    return NextResponse.json({
      query: raw,
      scopes,
      projects: ranked,
      collections: filterByName(collections),
      tags: filterByName(tags),
      smartCollections: smartResults,
      total: ranked.length,
      /** Lets the palette show "no results" only when it really means it. */
      hasQuery,
    });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
