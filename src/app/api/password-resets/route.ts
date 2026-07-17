import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { User as UserModel } from '@/lib/db/models/user.model';
import { PasswordResetService } from '@/lib/services/password-reset.service';
import { AuditService } from '@/lib/services/audit.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse, createdResponse, paginatedResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { createPasswordResetSchema } from '@/lib/validators/password-reset.schema';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * GET /api/password-resets
 * List password reset requests.
 * Super admin sees all, admin with canResetPasswords sees their own.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const currentUser = await AuthService.verifyToken(token);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    if (currentUser.role === 'admin' && !currentUser.permissions?.canResetPasswords) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to view password resets.', 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Super admin sees all, admin sees only their own requests
    const requestedBy = currentUser.role === 'super_admin' ? undefined : currentUser.id;

    const result = await PasswordResetService.listRequests({
      status,
      requestedBy,
      page,
      limit,
    });

    return paginatedResponse(result.data, result.pagination);
  } catch (error: any) {
    logger.error('Error in GET /api/password-resets:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to list reset requests'), 500);
  }
}

/**
 * POST /api/password-resets
 * Create a new password reset request.
 * Admin with canResetPasswords or super admin.
 */
export async function POST(req: NextRequest) {
  let targetPhoneNumber: string | undefined;
  let currentUser: any;
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    currentUser = await AuthService.verifyToken(token);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Permission check
    if (currentUser.role === 'admin' && !currentUser.permissions?.canResetPasswords) {
      return errorResponse('FORBIDDEN', 'You do not have permission to request password resets.', 403);
    }

    const body = await req.json();
    const parsed = createPasswordResetSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message || 'Invalid input',
        400,
        { issues: parsed.error.issues }
      );
    }

    targetPhoneNumber = parsed.data.targetPhoneNumber;

    const request = await PasswordResetService.createRequest(
      currentUser.id,
      targetPhoneNumber
    );

    // Audit log
    await AuditService.create({
      action: 'password_reset.requested',
      performedBy: currentUser.id as any,
      performedByRole: currentUser.role,
      targetType: 'password_reset',
      targetId: request.id as any,
      details: {
        targetStaffId: request.targetStaffId,
        targetPhoneNumber: request.targetPhoneNumber,
      },
    });

    return createdResponse(request);
  } catch (error: any) {
    logger.error('Error in POST /api/password-resets:', error);

    if (error.message === 'TARGET_IS_SUPER_ADMIN') {
      const targetUser = await UserModel.findOne({ phoneNumber: targetPhoneNumber });
      if (currentUser) {
        await AuditService.create({
          action: 'password_reset.requested',
          performedBy: currentUser.id,
          performedByRole: currentUser.role,
          targetType: 'user',
          targetId: targetUser ? targetUser._id.toString() : undefined,
          details: {
            targetStaffId: targetUser?.staffId || 'UNKNOWN',
            targetPhoneNumber,
            unauthorizedAttempt: true,
            reason: 'Attempted to request password reset for Super Admin',
          },
        });
      }
      return errorResponse('TARGET_IS_SUPER_ADMIN', 'Cannot request password reset for a super admin.', 403);
    }

    if (error.message?.includes('No active staff member') || error.message?.includes('already pending')) {
      return errorResponse('VALIDATION_ERROR', error.message, 400);
    }

    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to create reset request'), 500);
  }
}
