import { logger } from '@/lib/utils/logger';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      const res = errorResponse('UNAUTHORIZED', 'Invalid, expired, or revoked session', 401);
      res.headers.set(
        'Set-Cookie',
        `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      );
      return res;
    }

    return successResponse({ user });
  } catch (error: any) {
    logger.error('API me error:', error);
    return errorResponse('SERVER_ERROR', 'Failed to retrieve session user', 500);
  }
}
