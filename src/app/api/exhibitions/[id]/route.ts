import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ExhibitionService } from '@/lib/services/exhibition.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { updateExhibitionSchema } from '@/lib/validators/exhibition.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { hasAdminPermission } from '@/lib/utils/permission-helpers';
import { hasExhibitionAccess } from '@/lib/utils/exhibition-scope';

/**
 * GET /api/exhibitions/[id]
 * Fetch detailed configuration of a single exhibition.
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

    const doc = await ExhibitionService.findById(id);
    if (!doc) {
      return errorResponse('NOT_FOUND', 'Exhibition not found', 404);
    }

    return successResponse(doc);
  } catch (error: any) {
    logger.error('Error in GET /api/exhibitions/[id]:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to retrieve exhibition'), 500);
  }
}

/**
 * PATCH /api/exhibitions/[id]
 * Update an existing exhibition. Admin only.
 */
export async function PATCH(
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
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Only administrators can update exhibitions', 403);
    }

    if (!hasAdminPermission(user, 'canManageExhibitions')) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to manage exhibition lifecycle or edit setup', 403);
    }

    const { id } = await params;

    if (!hasExhibitionAccess(user, id)) {
      return errorResponse('FORBIDDEN', 'Access denied: You are not assigned to this exhibition', 403);
    }

    const body = await req.json();
    const parsed = updateExhibitionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid exhibition data', 400, parsed.error.flatten().fieldErrors);
    }

    const doc = await ExhibitionService.update(id, parsed.data, user.id);
    if (!doc) {
      return errorResponse('NOT_FOUND', 'Exhibition not found', 404);
    }

    return successResponse(doc);
  } catch (error: any) {
    logger.error('Error in PATCH /api/exhibitions/[id]:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to update exhibition'), 500);
  }
}

/**
 * DELETE /api/exhibitions/[id]
 * Soft delete (archive) an exhibition. Admin only.
 */
export async function DELETE(
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
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Only administrators can archive exhibitions', 403);
    }

    if (!hasAdminPermission(user, 'canManageExhibitions')) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to archive exhibitions', 403);
    }

    const { id } = await params;

    if (!hasExhibitionAccess(user, id)) {
      return errorResponse('FORBIDDEN', 'Access denied: You are not assigned to this exhibition', 403);
    }

    // Soft delete/archive the exhibition
    const doc = await ExhibitionService.update(id, { archive: true, status: 'archived' }, user.id);
    if (!doc) {
      return errorResponse('NOT_FOUND', 'Exhibition not found', 404);
    }

    return successResponse({ message: 'Exhibition successfully archived', id });
  } catch (error: any) {
    logger.error('Error in DELETE /api/exhibitions/[id]:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to archive exhibition'), 500);
  }
}
