import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_USER_ID = 'dev-user-id';

// GET /api/tags - List all tags
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      where: { userId: DEFAULT_USER_ID },
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      tags.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        projectCount: t._count.projects,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags - Create tag
export async function POST(request: NextRequest) {
  try {
    const { name, color = '#6366f1' } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: {
        userId: DEFAULT_USER_ID,
        name,
        color,
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
