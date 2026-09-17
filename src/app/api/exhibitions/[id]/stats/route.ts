import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ExhibitionService } from '@/lib/services/exhibition.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { hasExhibitionAccess } from '@/lib/utils/exhibition-scope';

/**
 * GET /api/exhibitions/[id]/stats
 * Retrieve statistics overview for an exhibition.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired session', 401);
    }

    const { id } = await params;
    if (!hasExhibitionAccess(user, id)) {
      return errorResponse('FORBIDDEN', 'Access denied: You are not assigned to this exhibition', 403);
    }

    const stats = await ExhibitionService.getStats(id);
    return successResponse(stats);
  } catch (error: any) {
    logger.error('Error in GET /api/exhibitions/[id]/stats:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to retrieve stats', 500);
  }
}
