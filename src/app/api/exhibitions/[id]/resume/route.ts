import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { ExhibitionService } from '@/lib/services/exhibition.service';
import { resumeExhibitionSchema } from '@/lib/validators/exhibition-lifecycle.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { hasAdminPermission } from '@/lib/utils/permission-helpers';
import { hasExhibitionAccess } from '@/lib/utils/exhibition-scope';

/**
 * POST /api/exhibitions/[id]/resume
 * Resume a paused exhibition (Requires canManageExhibitions or Super Admin).
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
    const body = await req.json().catch(() => ({}));
    const parseResult = resumeExhibitionSchema.safeParse(body);
    const reason = parseResult.success ? parseResult.data.reason : undefined;

    const updatedDoc = await ExhibitionService.resumeExhibition(id, user.id, reason);
    if (!updatedDoc) {
      return errorResponse('NOT_FOUND', 'Exhibition not found', 404);
    }

    return successResponse({
      message: `Exhibition '${updatedDoc.name}' has been resumed.`,
      exhibition: updatedDoc,
    });
  } catch (error: any) {
    logger.error('Error in POST /api/exhibitions/[id]/resume:', error);
    return errorResponse('BAD_REQUEST', safeErrorMessage(error, 'Failed to resume exhibition'), 400);
  }
}
