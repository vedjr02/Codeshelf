import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSearchQuery } from '@/lib/utils';

const DEFAULT_USER_ID = 'dev-user-id';

// GET /api/search - Smart global search across projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || '';

    if (!rawQuery.trim()) {
      return NextResponse.json({ projects: [], total: 0, query: '', filters: {} });
    }

    const { text, filters } = parseSearchQuery(rawQuery);

    // Build the query
    const where: any = {
      userId: DEFAULT_USER_ID,
      isArchived: false,
    };

    // Text search (name, description, readme)
    if (text) {
      where.OR = [
        { name: { contains: text, mode: 'insensitive' } },
        { description: { contains: text, mode: 'insensitive' } },
        { readme: { contains: text, mode: 'insensitive' } },
        { language: { contains: text, mode: 'insensitive' } },
        { framework: { contains: text, mode: 'insensitive' } },
        { gitRemote: { contains: text, mode: 'insensitive' } },
      ];
    }

    // Apply explicit filters from syntax (e.g. lang:typescript, status:active)
    if (filters.lang || filters.language) {
      where.language = { contains: filters.lang || filters.language, mode: 'insensitive' };
    }

    if (filters.framework) {
      where.framework = { contains: filters.framework, mode: 'insensitive' };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.is) {
      if (filters.is === 'favorite' || filters.is === 'fav') where.isFavorite = true;
      if (filters.is === 'pinned') where.isPinned = true;
      if (filters.is === 'archived') where.isArchived = true;
    }

    if (filters.tag) {
      where.tags = {
        some: {
          tag: {
            name: { contains: filters.tag, mode: 'insensitive' },
          },
        },
      };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        collections: { include: { collection: true } },
      },
      orderBy: { lastModified: 'desc' },
      take: 20,
    });

    const formattedProjects = projects.map(p => ({
      ...p,
      size: Number(p.size),
      tags: p.tags.map(t => t.tag),
      collections: p.collections.map(c => c.collection),
    }));

    return NextResponse.json({
      projects: formattedProjects,
      total: formattedProjects.length,
      query: rawQuery,
      filters,
    });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
