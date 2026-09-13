import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_USER_ID = 'dev-user-id';

// GET /api/collections - List all collections
export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      where: { userId: DEFAULT_USER_ID },
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      collections.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        color: c.color,
        projectCount: c._count.projects,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

// POST /api/collections - Create collection
export async function POST(request: NextRequest) {
  try {
    const { name, description, icon = 'folder', color = '#6366f1' } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const collection = await prisma.collection.create({
      data: {
        userId: DEFAULT_USER_ID,
        name,
        description,
        icon,
        color,
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Failed to create collection:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
