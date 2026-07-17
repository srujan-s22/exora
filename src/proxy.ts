import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'exora-token';

/**
 * Security response headers applied to every response.
 * These protect against XSS, clickjacking, MIME sniffing, and data leakage.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

/** Apply security headers to a NextResponse. */
function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  // HSTS only in production (requires HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  return response;
}

/**
 * Route-to-role mapping for edge middleware.
 * Mirrors the ROUTE_ROLE_MAP from src/lib/config/roles.ts.
 * Duplicated here because edge middleware cannot import non-edge-compatible modules.
 */
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  '/admin': ['super_admin', 'admin'],
  '/counter': ['super_admin', 'admin', 'counter'],
  '/gate': ['super_admin', 'admin', 'gate'],
  '/ride': ['super_admin', 'admin', 'gate', 'ride'],
};

/**
 * Lightweight JWT payload decoder for Edge Runtime.
 * Only decodes the payload segment (Base64) — does NOT verify the signature.
 * Actual cryptographic verification is performed by the API-level withAuth middleware.
 */
function decodeJwtPayload(token: string): { sub: string; staffId: string; role: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);

    if (!parsed.sub || !parsed.role || !parsed.exp) return null;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Get the correct dashboard path for a given role.
 * super_admin users use the /admin dashboard.
 */
function getDashboardPath(role: string): string {
  if (role === 'super_admin') return '/admin';
  return `/${role}`;
}

/**
 * Next.js Edge Middleware.
 * Handles authentication and role-based route protection.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // 1. Handle logged-in users visiting /login (redirect to correct dashboard)
  if (token && pathname === '/login') {
    const payload = decodeJwtPayload(token);
    if (payload) {
      return NextResponse.redirect(new URL(getDashboardPath(payload.role), request.url));
    }
  }

  // 2. Public paths — always accessible
  const publicPaths = ['/login', '/setup', '/unauthorized', '/api/auth/login', '/api/health', '/api/bootstrap'];
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 3. API routes — handled by API route level withAuth middleware
  if (pathname.startsWith('/api/')) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 4. Redirect unauthenticated users
  if (!token) {
    const isProtectedRoute = Object.keys(ROUTE_ROLE_MAP).some((prefix) =>
      pathname.startsWith(prefix)
    );
    if (isProtectedRoute || pathname === '/') {
      const loginUrl = new URL('/login', request.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // 5. Decode token and authorize path access
  const payload = decodeJwtPayload(token);

  if (!payload) {
    // Token is corrupt or expired — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  // Root path redirect based on role
  if (pathname === '/') {
    return NextResponse.redirect(new URL(getDashboardPath(payload.role), request.url));
  }

  // Protect role-restricted paths
  const matchedPrefix = Object.keys(ROUTE_ROLE_MAP).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (matchedPrefix) {
    const allowedRoles = ROUTE_ROLE_MAP[matchedPrefix];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
};
