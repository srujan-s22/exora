import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { AuthService } from '@/lib/services/auth.service';
import { PasswordResetService } from '@/lib/services/password-reset.service';
import { AuditService } from '@/lib/services/audit.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { passwordResetActionSchema, passwordResetCompleteSchema } from '@/lib/validators/password-reset.schema';
import { safeErrorMessage } from '@/lib/utils/sanitize';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/password-resets/:id
 * Get a single password reset request. Super admin or the requesting admin.
 */
export async function GET(req: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('INVALID_ID', 'Invalid request ID', 400);
    }

    const request = await PasswordResetService.getRequestById(id);
    if (!request) {
      return errorResponse('NOT_FOUND', 'Password reset request not found', 404);
    }

    // Admin can only see their own requests
    if (currentUser.role === 'admin' && request.requestedBy !== currentUser.id) {
      return errorResponse('FORBIDDEN', 'You can only view your own reset requests', 403);
    }

    return successResponse(request);
  } catch (error: any) {
    logger.error('Error in GET /api/password-resets/[id]:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to fetch reset request'), 500);
  }
}

/**
 * PATCH /api/password-resets/:id
 * Approve or reject a password reset request. Super admin only.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const currentUser = await AuthService.verifyToken(token);
    if (!currentUser) {
      return errorResponse('UNAUTHORIZED', 'Invalid session', 401);
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('INVALID_ID', 'Invalid request ID', 400);
    }

    const body = await req.json();
    const action = body?.action;

    if (action === 'approve' || action === 'reject') {
      // Only super admin can approve/reject
      if (currentUser.role !== 'super_admin') {
        return errorResponse('FORBIDDEN', 'Only super admins can approve or reject password reset requests', 403);
      }

      const parsed = passwordResetActionSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return errorResponse('VALIDATION_ERROR', firstError?.message || 'Invalid input', 400);
      }

      const { reason } = parsed.data;

      if (action === 'approve') {
        const { request } = await PasswordResetService.approveRequest(id, currentUser.id);

        // Audit log for approval
        await AuditService.create({
          action: 'password_reset.approved',
          performedBy: currentUser.id as any,
          performedByRole: currentUser.role,
          targetType: 'password_reset',
          targetId: id as any,
          details: {
            targetStaffId: request.targetStaffId,
            targetUserId: request.targetUserId,
          },
        });

        return successResponse({
          request,
          message: 'Password reset request approved. The requesting admin can now set a new password.',
        });
      } else {
        const request = await PasswordResetService.rejectRequest(id, currentUser.id, reason);

        // Audit log for rejection
        await AuditService.create({
          action: 'password_reset.rejected',
          performedBy: currentUser.id as any,
          performedByRole: currentUser.role,
          targetType: 'password_reset',
          targetId: id as any,
          details: {
            targetStaffId: request.targetStaffId,
            reason,
          },
        });

        return successResponse({
          request,
          message: 'Password reset request rejected.',
        });
      }
    } else if (action === 'complete') {
      // Any admin with canResetPasswords or super admin can complete
      if (currentUser.role !== 'super_admin' && !currentUser.permissions?.canResetPasswords) {
        return errorResponse('FORBIDDEN', 'You do not have permission to reset passwords.', 403);
      }

      const parsed = passwordResetCompleteSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return errorResponse('VALIDATION_ERROR', firstError?.message || 'Invalid password input', 400);
      }

      const { password } = parsed.data;

      // Complete the reset and update the target user password
      const request = await PasswordResetService.completeRequest(id, currentUser.id, password);

      // Audit log for password change completed on target user
      await AuditService.create({
        action: 'password_reset.completed',
        performedBy: currentUser.id as any,
        performedByRole: currentUser.role,
        targetType: 'user',
        targetId: request.targetUserId as any,
        details: {
          targetStaffId: request.targetStaffId,
          method: 'approval_based_reset',
          resetRequestId: id,
        },
      });

      return successResponse({
        request,
        message: 'Password reset completed successfully. The new password has been set.',
      });
    } else {
      return errorResponse('INVALID_ACTION', 'Action must be approve, reject, or complete', 400);
    }
  } catch (error: any) {
    logger.error('Error in PATCH /api/password-resets/[id]:', error);

    if (error.message?.includes('not found') || error.message?.includes('Cannot') || error.message?.includes('must be approved')) {
      return errorResponse('VALIDATION_ERROR', error.message, 400);
    }

    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to process reset request'), 500);
  }
}
