import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

// GET /api/auth/me - Return the current session user (or null)
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  return NextResponse.json({ user });
}
