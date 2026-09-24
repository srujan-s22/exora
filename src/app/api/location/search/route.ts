import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { LocationSearchService } from '@/lib/services/location-search.service';
import { errorResponse, successResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { logger } from '@/lib/utils/logger';

// In-memory rate limiting: max 60 search requests per 60 seconds per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(key, timestamps);

  // Periodically trim map size if growing large
  if (rateLimitMap.size > 1000) {
    for (const [k, ts] of rateLimitMap.entries()) {
      if (ts.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(k);
      }
    }
  }

  return true;
}

/**
 * GET /api/location/search
 * Protected provider-independent location search endpoint.
 * Restricted to super_admin and admin roles (operators authorized to manage exhibitions).
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Session Authentication & Authorization
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired session', 401);
    }

    // Role check: Only admin and super_admin are authorized to search venues and configure exhibition locations
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied. Only administrators can search exhibition locations.', 403);
    }

    // 2. Rate Limiting Check
    if (!checkRateLimit(user.id)) {
      return errorResponse('TOO_MANY_REQUESTS', 'Location search rate limit exceeded. Please wait a moment.', 429);
    }

    // 3. Query Parameter Validation
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q || typeof q !== 'string') {
      return errorResponse('BAD_REQUEST', 'Search query parameter "q" is required.', 400);
    }

    const trimmedQuery = q.trim();
    if (trimmedQuery.length < 3) {
      return errorResponse('BAD_REQUEST', 'Search query must be at least 3 characters long.', 400);
    }

    if (trimmedQuery.length > 100) {
      return errorResponse('BAD_REQUEST', 'Search query cannot exceed 100 characters.', 400);
    }

    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 6;
    const boundedLimit = isNaN(limit) ? 6 : Math.min(Math.max(limit, 1), 10);

    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const latitude = latParam ? parseFloat(latParam) : undefined;
    const longitude = lonParam ? parseFloat(lonParam) : undefined;

    // 4. Perform Search via LocationSearchService
    const results = await LocationSearchService.search(trimmedQuery, {
      limit: boundedLimit,
      latitude: latitude && !isNaN(latitude) ? latitude : undefined,
      longitude: longitude && !isNaN(longitude) ? longitude : undefined,
      signal: req.signal,
    });

    return successResponse(results, { count: results.length, query: trimmedQuery });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      return errorResponse('REQUEST_TIMEOUT', 'Location search request timed out or was aborted.', 408);
    }
    logger.warn('Location Search API error', { error: error.message || String(err) });
    return errorResponse('INTERNAL_ERROR', 'Location search is temporarily unavailable.', 500);
  }
}
