import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { loginSchema } from '@/lib/validators/auth.schema';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * POST /api/auth/login
 * Authenticate a staff member. Rate-limited per IP using env-configured thresholds.
 */
export const POST = withRateLimit(
  {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  },
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // 1. Zod input validation
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid input parameters',
          400,
          parsed.error.flatten().fieldErrors
        );
      }

      // 2. Fetch connection context (headers)
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || (req as any).ip || undefined;
      const userAgent = req.headers.get('user-agent') || undefined;

      // 3. Authenticate credentials
      const { user, token } = await AuthService.login(parsed.data, ipAddress, userAgent);

      // 4. Set HTTP-only cookie
      const cookieStore = await cookies();
      cookieStore.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 8, // 8 hours in seconds
        path: '/',
      });

      return successResponse({ user });
    } catch (error: any) {
      logger.error('Login API error:', error);
      return errorResponse(
        'UNAUTHORIZED',
        safeErrorMessage(error, 'Authentication failed'),
        401
      );
    }
  }
);

