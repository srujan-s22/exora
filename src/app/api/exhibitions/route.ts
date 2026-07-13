import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ExhibitionService } from '@/lib/services/exhibition.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { createExhibitionSchema } from '@/lib/validators/exhibition.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * GET /api/exhibitions
 * List all exhibitions with search, status, and category filtering.
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const result = await ExhibitionService.list({
      page,
      limit,
      search,
      status,
      category,
      includeArchived: user.role === 'admin' ? includeArchived : false,
    });

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in GET /api/exhibitions:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to list exhibitions'), 500);
  }
}

/**
 * POST /api/exhibitions
 * Create a new exhibition. Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user || user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Only administrators can create exhibitions', 403);
    }

    const body = await req.json();
    const parsed = createExhibitionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid exhibition data', 400, parsed.error.flatten().fieldErrors);
    }

    const doc = await ExhibitionService.create(parsed.data, user.id);
    return createdResponse(doc);
  } catch (error: any) {
    logger.error('Error in POST /api/exhibitions:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to create exhibition'), 500);
  }
}
