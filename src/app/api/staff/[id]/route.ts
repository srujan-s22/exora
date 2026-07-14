import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { User as UserModel } from '@/lib/db/models/user.model';
import { AuthService } from '@/lib/services/auth.service';
import { AuditService } from '@/lib/services/audit.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { updateStaffSchema } from '@/lib/validators/staff.schema';
import { hashPassword } from '@/lib/utils/crypto';
import { safeErrorMessage } from '@/lib/utils/sanitize';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/staff/:id
 * Retrieve a single staff member by ID. Super admin and admin only.
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
      return errorResponse('INVALID_ID', 'Invalid staff member ID', 400);
    }

    const staff = await UserModel.findById(id)
      .select('name staffId phoneNumber email role permissions isActive assignedExhibitions lastLoginAt lastLoginIp createdBy createdAt updatedAt')
      .populate('assignedExhibitions', 'name status')
      .populate('createdBy', 'name staffId');

    if (!staff) {
      return errorResponse('NOT_FOUND', 'Staff member not found', 404);
    }

    // Fetch recent audit logs for this user
    const auditLogs = await AuditService.getByEntity('user', id);

    return successResponse({
      ...staff.toJSON(),
      recentActivity: auditLogs.slice(0, 20),
      _currentUserRole: currentUser.role,
      _isCurrentUser: currentUser.id === id,
    });
  } catch (error: any) {
    logger.error('Error in GET /api/staff/[id]:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to fetch staff member'), 500);
  }
}

/**
 * PATCH /api/staff/:id
 * Update a staff member. Super admin and admin only.
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
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('INVALID_ID', 'Invalid staff member ID', 400);
    }

    const body = await req.json();
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message || 'Invalid input',
        400,
        { issues: parsed.error.issues }
      );
    }

    const staff = await UserModel.findById(id).select('+passwordHash');
    if (!staff) {
      return errorResponse('NOT_FOUND', 'Staff member not found', 404);
    }

    // ── Admin-to-admin protection ──
    // Only Super Admin can modify another admin or super_admin account.
    const isSuperAdmin = currentUser.role === 'super_admin';

    if ((staff.role === 'admin' || staff.role === 'super_admin') && currentUser.id !== id && !isSuperAdmin) {
      return errorResponse('FORBIDDEN', 'Only a Super Admin can modify another admin profile.', 403);
    }

    const updates = parsed.data;
    const changes: Record<string, { from: any; to: any }> = {};

    // Track and apply changes
    if (updates.name !== undefined && updates.name !== staff.name) {
      changes.name = { from: staff.name, to: updates.name };
      staff.name = updates.name;
    }

    if (updates.phoneNumber !== undefined && updates.phoneNumber !== staff.phoneNumber) {
      changes.phoneNumber = { from: staff.phoneNumber, to: updates.phoneNumber };
      staff.phoneNumber = updates.phoneNumber;
    }

    if (updates.email !== undefined) {
      const newEmail = updates.email || undefined;
      if (newEmail !== staff.email) {
        // Check for duplicate email
        if (newEmail) {
          const existingEmail = await UserModel.findOne({
            email: newEmail.toLowerCase(),
            _id: { $ne: id },
          });
          if (existingEmail) {
            return errorResponse('DUPLICATE', 'A staff member with this email already exists', 409);
          }
        }
        changes.email = { from: staff.email, to: newEmail };
        staff.email = newEmail as any;
      }
    }

    if (updates.role !== undefined && updates.role !== staff.role) {
      // Only super admin can change roles
      if (!isSuperAdmin) {
        return errorResponse('FORBIDDEN', 'Only a Super Admin can change user roles.', 403);
      }
      changes.role = { from: staff.role, to: updates.role };
      staff.role = updates.role;
    }

    if (updates.assignedExhibitions !== undefined) {
      changes.assignedExhibitions = {
        from: staff.assignedExhibitions.map((e: any) => e.toString()),
        to: updates.assignedExhibitions,
      };
      staff.assignedExhibitions = updates.assignedExhibitions as any;
    }

    if (updates.isActive !== undefined && updates.isActive !== staff.isActive) {
      // Prevent self-deactivation
      if (currentUser.id === id && !updates.isActive) {
        return errorResponse('FORBIDDEN', 'You cannot deactivate your own account', 403);
      }
      changes.isActive = { from: staff.isActive, to: updates.isActive };
      staff.isActive = updates.isActive;
    }

    if (updates.password) {
      staff.passwordHash = await hashPassword(updates.password);
      staff.passwordUpdatedAt = new Date();
      changes.password = { from: '***', to: '***' };
    }

    await staff.save();

    // Determine the audit action
    let auditAction: string = 'user.update';
    if (changes.isActive) {
      auditAction = changes.isActive.to ? 'user.activate' : 'user.deactivate';
    }
    if (changes.password) {
      auditAction = 'user.password_change';
    }

    await AuditService.create({
      action: auditAction as any,
      performedBy: currentUser.id as any,
      performedByRole: currentUser.role,
      targetType: 'user',
      targetId: staff._id,
      details: { changes },
    });

    // Return updated staff
    const updated = await UserModel.findById(id)
      .select('name staffId phoneNumber email role permissions isActive assignedExhibitions lastLoginAt createdBy createdAt updatedAt')
      .populate('assignedExhibitions', 'name status')
      .populate('createdBy', 'name staffId');

    return successResponse(updated?.toJSON());
  } catch (error: any) {
    logger.error('Error in PATCH /api/staff/[id]:', error);
    if (error.code === 11000) {
      return errorResponse('DUPLICATE', 'A staff member with this identifier already exists', 409);
    }
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to update staff member'), 500);
  }
}

/**
 * DELETE /api/staff/:id
 * Soft-delete (deactivate) a staff member. Super admin and admin only.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
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
      return errorResponse('INVALID_ID', 'Invalid staff member ID', 400);
    }

    // Prevent self-deactivation
    if (currentUser.id === id) {
      return errorResponse('FORBIDDEN', 'You cannot deactivate your own account', 403);
    }

    const staff = await UserModel.findById(id);
    if (!staff) {
      return errorResponse('NOT_FOUND', 'Staff member not found', 404);
    }

    if (!staff.isActive) {
      return errorResponse('ALREADY_INACTIVE', 'Staff member is already deactivated', 400);
    }

    // ── Admin-to-admin protection ──
    const isSuperAdmin = currentUser.role === 'super_admin';

    if ((staff.role === 'admin' || staff.role === 'super_admin') && !isSuperAdmin) {
      return errorResponse('FORBIDDEN', 'Only a Super Admin can deactivate another admin profile.', 403);
    }

    staff.isActive = false;
    await staff.save();

    await AuditService.create({
      action: 'user.deactivate',
      performedBy: currentUser.id as any,
      performedByRole: currentUser.role,
      targetType: 'user',
      targetId: staff._id,
      details: { staffId: staff.staffId, name: staff.name },
    });

    return successResponse({ message: 'Staff member deactivated', staff: staff.toJSON() });
  } catch (error: any) {
    logger.error('Error in DELETE /api/staff/[id]:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to deactivate staff member'), 500);
  }
}
