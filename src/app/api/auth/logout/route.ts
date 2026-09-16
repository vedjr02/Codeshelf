import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearSessionCookie, SESSION_COOKIE } from '@/lib/session';

// POST /api/auth/logout - End the current session
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { sessionToken: token } });
    }
    return clearSessionCookie(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('Logout failed:', error);
    return clearSessionCookie(NextResponse.json({ error: 'Logout failed' }, { status: 500 }));
  }
}

// GET /api/auth/logout is not used; keep POST-only semantics explicit
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
