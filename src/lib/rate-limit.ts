/**
 * A small fixed-window limiter for the credential endpoints.
 *
 * CodeShelf runs as one process on one machine, so an in-memory map is the
 * right size of tool: no extra service, and the counters die with the server.
 * It exists to make online password guessing slow, not to survive a restart.
 */

interface Window {
  count: number;
  /** Epoch ms at which the window resets. */
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Windows are dropped lazily, so an idle server does not hold old keys. */
function sweep(now: number): void {
  if (windows.size < 512) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds the caller should wait, for the Retry-After header. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Clears a key after a success, so one good sign-in resets the budget. */
export function resetRateLimit(key: string): void {
  windows.delete(key);
}

/**
 * Best-effort client identity. Behind a reverse proxy the forwarded address is
 * the only thing available; on localhost every caller collapses to one key,
 * which is the correct behaviour for a single-user machine.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'local';
}
