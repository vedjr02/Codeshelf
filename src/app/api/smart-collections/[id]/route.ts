import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { describeRules, validateRules } from '@/lib/smart-rules';

async function own(request: NextRequest, id: string) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const collection = await prisma.smartCollection.findFirst({ where: { id, userId: user.id } });
  if (!collection) {
    return { error: NextResponse.json({ error: 'Smart collection not found' }, { status: 404 }) };
  }
  return { collection, userId: user.id };
}

/** PATCH — rename or change the rules. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { collection, userId, error } = await own(request, id);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const data: { name?: string; icon?: string; rules?: string } = {};

    if (typeof body?.name === 'string') {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: 'Give the collection a name' }, { status: 400 });
      if (name !== collection.name) {
        const clash = await prisma.smartCollection.findFirst({ where: { userId, name } });
        if (clash) return NextResponse.json({ error: 'That name is already used' }, { status: 409 });
      }
      data.name = name.slice(0, 60);
    }

    if (typeof body?.icon === 'string') data.icon = body.icon.slice(0, 40);

    if (body?.rules !== undefined) {
      const validated = validateRules(body.rules);
      if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
      data.rules = JSON.stringify(validated.rules);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.smartCollection.update({ where: { id: collection.id }, data });
    const rules = validateRules(JSON.parse(updated.rules));

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      icon: updated.icon,
      rules: 'rules' in rules ? rules.rules : { match: 'all', conditions: [] },
      description: 'rules' in rules ? describeRules(rules.rules) : '',
    });
  } catch (err) {
    console.error('Failed to update smart collection:', err);
    return NextResponse.json({ error: 'Failed to update smart collection' }, { status: 500 });
  }
}

/** DELETE — removes the rule set. No project is touched. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { collection, error } = await own(request, id);
    if (error) return error;

    await prisma.smartCollection.delete({ where: { id: collection.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete smart collection:', err);
    return NextResponse.json({ error: 'Failed to delete smart collection' }, { status: 500 });
  }
}
