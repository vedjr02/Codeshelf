import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/lib/session';
import { clientKey, rateLimit, resetRateLimit } from '@/lib/rate-limit';

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 1000 * 60 * 10; // 10 minutes

/**
 * A real bcrypt hash of a value nobody knows. Comparing against it when the
 * email does not exist keeps the response time of "no such user" and "wrong
 * password" in the same range, so the endpoint does not tell an attacker which
 * emails have accounts.
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7oQIrHBXrqYLyNqAlhRJfCfLBJKGFOu';

// POST /api/auth/login - Verify credentials and start a session
export async function POST(request: NextRequest) {
  try {
    const key = `login:${clientKey(request)}`;
    const limit = rateLimit(key, MAX_ATTEMPTS, WINDOW_MS);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const { email, password } = await request.json();

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const isValid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);

    if (!user || !user.passwordHash || !isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    resetRateLimit(key);

    const token = await createSession(user.id);
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    return setSessionCookie(response, token);
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
