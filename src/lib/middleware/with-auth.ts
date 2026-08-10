import { type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { logger } from '@/lib/utils/logger';
import { SessionService } from '@/lib/services/session.service';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { resolvePermissions } from '@/lib/config/roles';
import type { JwtPayload } from '@/types/auth.types';

export interface AuthenticatedRequest extends NextRequest {
  user: JwtPayload;
}

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

/**
 * API middleware that verifies JWT from HTTP-only cookie.
 * Injects `req.user` with the decoded JWT payload.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (
    req: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<Response> => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

      if (!token) {
        return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('JWT_SECRET not configured');
        return errorResponse('SERVER_ERROR', 'Server configuration error', 500);
      }

      const payload = jwt.verify(token, secret) as JwtPayload;

      if ((payload as any).type === 'mfa_pending') {
        return errorResponse('UNAUTHORIZED', 'Multi-factor authentication required', 401);
      }

      // Verify server-side session validity if session ID is embedded
      if (payload.sid) {
        const sessionValidation = await SessionService.validateSession(payload.sid);
        if (!sessionValidation.valid) {
          const res = errorResponse(
            'SESSION_REVOKED',
            'Your session has been revoked or expired. Please log in again.',
            401
          );
          // Purge cookie from browser immediately
          res.headers.set(
            'Set-Cookie',
            `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
          );
          return res;
        }
      }

      // Attach user to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = payload;

      // Re-hydrate permissions and exhibition scope from DB so changes apply in real-time
      if (payload.sub && (payload.role === 'admin' || payload.role === 'counter' || payload.role === 'gate' || payload.role === 'ride')) {
        await connectToDatabase();
        const freshUser = await UserModel.findById(payload.sub)
          .select('permissions role isActive exhibitionAccessMode assignedExhibitions')
          .lean();
        if (freshUser) {
          if (!freshUser.isActive) {
            return errorResponse('UNAUTHORIZED', 'Account is deactivated', 401);
          }
          authenticatedReq.user.permissions = resolvePermissions(freshUser.role, freshUser.permissions as any);
          authenticatedReq.user.exhibitionAccessMode = freshUser.exhibitionAccessMode || 'GENERAL';
          authenticatedReq.user.exhibitions = (freshUser.assignedExhibitions || []).map((id: any) => id.toString());
        }
      }

      return handler(authenticatedReq, context);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return errorResponse('TOKEN_EXPIRED', 'Session expired. Please log in again.', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return errorResponse('INVALID_TOKEN', 'Invalid authentication token', 401);
      }
      logger.error('Auth middleware error', error);
      return errorResponse('AUTH_ERROR', 'Authentication failed', 401);
    }
  };
}
