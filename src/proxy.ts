import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'codeshelf_session';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Headers every HTML response carries.
 *
 * CodeShelf is a private tool that reaches the filesystem, so the goal is to
 * keep it off search engines, out of frames, and unable to talk to anywhere
 * but itself.
 */
function securityHeaders(nonce: string, secure: boolean): Record<string, string> {
  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced Next.js bootstrap load its own chunks.
    // Dev additionally needs eval for hot reloading; production does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Tailwind and Next inject style tags at runtime, which cannot be nonced.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Same-origin API only. Dev also needs the HMR websocket.
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  // No upgrade-insecure-requests: CodeShelf is normally served over plain HTTP
  // on a machine you are sitting at, and upgrading would break a LAN-bound
  // instance. HSTS is added only once the connection is already HTTPS.
  const headers: Record<string, string> = {
    'Content-Security-Policy': csp,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // A personal library of local paths belongs in no search index.
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  };

  if (secure) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains';
  }

  return headers;
}

function withSecurity(response: NextResponse, nonce: string, secure: boolean): NextResponse {
  for (const [name, value] of Object.entries(securityHeaders(nonce, secure))) {
    response.headers.set(name, value);
  }
  return response;
}

// Next.js 16: middleware is now "proxy" (src/proxy.ts, named export `proxy`).
export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const secure =
    request.nextUrl.protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https';
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const { pathname } = request.nextUrl;

  if (!hasSession && pathname !== '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return withSecurity(NextResponse.redirect(url), nonce, secure);
  }

  if (hasSession && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return withSecurity(NextResponse.redirect(url), nonce, secure);
  }

  // The nonce travels on the request so the layout can put it on its inline
  // script, and on the CSP request header so Next.js nonces its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set(
    'Content-Security-Policy',
    securityHeaders(nonce, secure)['Content-Security-Policy']
  );

  return withSecurity(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
    secure
  );
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
