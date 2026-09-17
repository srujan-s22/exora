import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { ExhibitionService } from '@/lib/services/exhibition.service';
import { extendExhibitionSchema } from '@/lib/validators/exhibition-lifecycle.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { hasAdminPermission } from '@/lib/utils/permission-helpers';
import { hasExhibitionAccess } from '@/lib/utils/exhibition-scope';

/**
 * POST /api/exhibitions/[id]/extend
 * Extend exhibition end date (Requires canManageExhibitions or Super Admin).
 */
export async function POST(
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

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied: Admin privileges required', 403);
    }

    if (!hasAdminPermission(user, 'canManageExhibitions')) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to manage exhibition lifecycle', 403);
    }

    const { id } = await params;
    if (!hasExhibitionAccess(user, id)) {
      return errorResponse('FORBIDDEN', 'Access denied: You are not assigned to this exhibition', 403);
    }
    const body = await req.json();
    const parseResult = extendExhibitionSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'Invalid input data', 400);
    }

    const newEndDate = new Date(parseResult.data.newEndDate);
    const updatedDoc = await ExhibitionService.extendExhibition(id, user.id, newEndDate, parseResult.data.reason);
    if (!updatedDoc) {
      return errorResponse('NOT_FOUND', 'Exhibition not found', 404);
    }

    return successResponse({
      message: `Exhibition '${updatedDoc.name}' end date extended to ${newEndDate.toLocaleString('en-IN')}.`,
      exhibition: updatedDoc,
    });
  } catch (error: any) {
    logger.error('Error in POST /api/exhibitions/[id]/extend:', error);
    return errorResponse('BAD_REQUEST', safeErrorMessage(error, 'Failed to extend exhibition'), 400);
  }
}
