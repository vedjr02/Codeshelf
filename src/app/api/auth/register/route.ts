import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/lib/session';
import { clientKey, rateLimit } from '@/lib/rate-limit';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 1000 * 60 * 60; // 1 hour

/**
 * Registration closes after the first account.
 *
 * An account here can scan, open and delete folders on the host machine, so an
 * open sign-up form is a remote foothold for anyone who can reach the port.
 * The first run needs a way in; after that, set CODESHELF_ALLOW_REGISTRATION=true
 * to add another person deliberately.
 */
async function registrationOpen(): Promise<boolean> {
  if (process.env.CODESHELF_ALLOW_REGISTRATION === 'true') return true;
  const existing = await prisma.user.count();
  return existing === 0;
}

// GET /api/auth/register - Whether the sign-up form should be offered
export async function GET() {
  try {
    return NextResponse.json({ open: await registrationOpen() });
  } catch {
    return NextResponse.json({ open: false });
  }
}

// POST /api/auth/register - Create an account and start a session
export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(`register:${clientKey(request)}`, MAX_ATTEMPTS, WINDOW_MS);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    if (!(await registrationOpen())) {
      return NextResponse.json(
        {
          error:
            'This shelf already has an account. Set CODESHELF_ALLOW_REGISTRATION=true on the server to add another.',
        },
        { status: 403 }
      );
    }

    const { name, email, password } = await request.json();

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (password.length > 200) {
      return NextResponse.json({ error: 'Password is too long' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: typeof name === 'string' && name.trim() ? name.trim() : null,
        passwordHash,
      },
    });

    const token = await createSession(user.id);
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    return setSessionCookie(response, token);
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
