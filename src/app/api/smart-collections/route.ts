import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { loadProjects, serializeProject, toEvaluable } from '@/lib/project-query';
import { parseRules, matchesRules, describeRules, validateRules } from '@/lib/smart-rules';

/** GET — every smart collection with its live count. */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [collections, rows] = await Promise.all([
      prisma.smartCollection.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }),
      loadProjects(user.id),
    ]);

    const projects = rows.map(serializeProject).filter((p) => !p.isArchived);

    return NextResponse.json(
      collections.map((collection) => {
        const rules = parseRules(collection.rules);
        const matched = projects.filter((p) => matchesRules(toEvaluable(p), rules));
        return {
          id: collection.id,
          name: collection.name,
          icon: collection.icon,
          rules,
          description: describeRules(rules),
          projectCount: matched.length,
          /** A couple of names so the card shows something concrete. */
          sample: matched.slice(0, 3).map((p) => ({ id: p.id, name: p.name })),
        };
      })
    );
  } catch (error) {
    console.error('Failed to list smart collections:', error);
    return NextResponse.json({ error: 'Failed to load smart collections' }, { status: 500 });
  }
}

/** POST — create one. */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Give the collection a name' }, { status: 400 });
    if (name.length > 60) return NextResponse.json({ error: 'That name is too long' }, { status: 400 });

    const validated = validateRules(body?.rules);
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

    const existing = await prisma.smartCollection.findFirst({ where: { userId: user.id, name } });
    if (existing) {
      return NextResponse.json({ error: 'You already have a smart collection with that name' }, { status: 409 });
    }

    const created = await prisma.smartCollection.create({
      data: {
        userId: user.id,
        name,
        icon: typeof body?.icon === 'string' ? body.icon.slice(0, 40) : 'sparkles',
        rules: JSON.stringify(validated.rules),
      },
    });

    return NextResponse.json({
      id: created.id,
      name: created.name,
      icon: created.icon,
      rules: validated.rules,
      description: describeRules(validated.rules),
      projectCount: 0,
      sample: [],
    });
  } catch (error) {
    console.error('Failed to create smart collection:', error);
    return NextResponse.json({ error: 'Failed to create smart collection' }, { status: 500 });
  }
}
