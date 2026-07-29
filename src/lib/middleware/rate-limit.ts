import { errorResponse } from '@/lib/utils/api-response';
import type { NextRequest } from 'next/server';

/**
 * In-memory rate limiting for serverless environments.
 *
 * ⚠️  PRODUCTION WARNING: This in-memory implementation is NOT suitable for
 * serverless deployments (Vercel, AWS Lambda) where each invocation may get
 * a fresh runtime instance, effectively resetting all counters. For production,
 * replace with Redis-backed rate limiting (e.g., @upstash/ratelimit).
 *
 * The setInterval-based cleanup has been replaced with lazy cleanup on each
 * request to avoid timer compatibility issues with serverless runtimes.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/** Lazy cleanup: remove expired entries on each rate-limit check */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}


interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
  keyGenerator?: (req: NextRequest) => string;
}

/**
 * Rate limiting middleware.
 * Default: 5 requests per 15 minutes per key.
 * Security Note: Default key generator prefixes IP with keyPrefix or request pathname
 * to prevent key collisions across distinct API endpoints.
 */
export function withRateLimit(
  options: RateLimitOptions,
  handler: (req: NextRequest, context?: any) => Promise<Response>
) {
  const {
    windowMs = 900000, // 15 minutes
    maxRequests = 5,
    keyPrefix,
    keyGenerator = (req) => {
      const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
      const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
      const prefix = keyPrefix || req.nextUrl?.pathname || 'global';
      return `${prefix}:${ip}`;
    },
  } = options;

  return async (req: NextRequest, context?: any): Promise<Response> => {
    cleanupExpiredEntries();
    const key = keyGenerator(req);
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return handler(req, context);
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please try again later.',
        429,
        { retryAfterSeconds: retryAfter }
      );
    }

    entry.count++;
    return handler(req, context);
  };
}
