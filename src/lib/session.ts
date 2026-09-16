import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'codeshelf_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Resolve the current session from the request cookies.
 * Returns the user, or null when unauthenticated / session expired.
 */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const eq = c.indexOf('=');
        return [c.slice(0, eq), decodeURIComponent(c.slice(eq + 1))];
      })
  );

  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session) return null;
    if (session.expires.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return { id: session.user.id, email: session.user.email, name: session.user.name };
  } catch {
    return null;
  }
}

/**
 * Attach a session cookie to a response.
 */
export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return response;
}

/**
 * Clear the session cookie on a response.
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/**
 * Create a session row for a user and return the token.
 */
export async function createSession(userId: string): Promise<string> {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expires: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}
