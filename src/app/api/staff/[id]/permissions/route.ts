import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { AuthService } from '@/lib/services/auth.service';
import { StaffService } from '@/lib/services/staff.service';
import { AuditService } from '@/lib/services/audit.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { updatePermissionsSchema } from '@/lib/validators/staff.schema';
import { safeErrorMessage } from '@/lib/utils/sanitize';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/staff/:id/permissions
 * Update an admin's permissions. Super admin only.
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

    // Only super admins can manage permissions
    if (!currentUser || currentUser.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Only super admins can manage user permissions', 403);
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('INVALID_ID', 'Invalid staff member ID', 400);
    }

    const body = await req.json();
    const parsed = updatePermissionsSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message || 'Invalid input',
        400,
        { issues: parsed.error.issues }
      );
    }

    // Get current permissions for audit diff
    const currentStaff = await StaffService.findById(id);
    if (!currentStaff) {
      return errorResponse('NOT_FOUND', 'Staff member not found', 404);
    }
    if (currentStaff.role !== 'admin') {
      return errorResponse('INVALID_ROLE', 'Permissions can only be set on admin users. Super admins have all permissions by default.', 400);
    }

    const previousPermissions = { ...currentStaff.permissions };

    // Update permissions
    const updated = await StaffService.updatePermissions(id, parsed.data);
    if (!updated) {
      return errorResponse('NOT_FOUND', 'Staff member not found', 404);
    }

    // Audit log
    await AuditService.create({
      action: 'user.permissions_changed',
      performedBy: currentUser.id as any,
      performedByRole: currentUser.role,
      targetType: 'user',
      targetId: id as any,
      details: {
        staffId: updated.staffId,
        name: updated.name,
        previousPermissions,
        newPermissions: updated.permissions,
        changedFields: parsed.data,
      },
    });

    return successResponse({
      ...updated,
      message: 'Permissions updated successfully',
    });
  } catch (error: any) {
    logger.error('Error in PATCH /api/staff/[id]/permissions:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to update permissions'), 500);
  }
}

/**
 * GET /api/staff/:id/permissions
 * Get an admin's current permissions. Super admin only.
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
    if (!currentUser || currentUser.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Only super admins can view user permissions', 403);
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('INVALID_ID', 'Invalid staff member ID', 400);
    }

    const staff = await StaffService.findById(id);
    if (!staff) {
      return errorResponse('NOT_FOUND', 'Staff member not found', 404);
    }

    return successResponse({
      staffId: staff.staffId,
      name: staff.name,
      role: staff.role,
      permissions: staff.permissions,
    });
  } catch (error: any) {
    logger.error('Error in GET /api/staff/[id]/permissions:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to fetch permissions'), 500);
  }
}
