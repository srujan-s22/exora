import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { User as UserModel } from '@/lib/db/models/user.model';
import { AuthService } from '@/lib/services/auth.service';
import { StaffService } from '@/lib/services/staff.service';
import { connectToDatabase } from '@/lib/db/connection';
import { errorResponse, createdResponse, paginatedResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { createStaffSchema } from '@/lib/validators/staff.schema';
import { AuditService } from '@/lib/services/audit.service';
import { escapeRegex, safeErrorMessage } from '@/lib/utils/sanitize';
import { timingSafeStringEqual } from '@/lib/utils/crypto';

/**
 * GET /api/staff
 * Retrieve a paginated, filterable list of staff members. Super admin and admin only.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || undefined;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // Role filter
    if (role) {
      query.role = role;
    }

    // Active/inactive status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Search by name, staffId, or phoneNumber (sanitize to prevent ReDoS)
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { staffId: { $regex: safeSearch, $options: 'i' } },
        { phoneNumber: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const total = await UserModel.countDocuments(query);
    const staff = await UserModel.find(query)
      .select('name staffId phoneNumber email role permissions isActive assignedExhibitions lastLoginAt createdAt')
      .populate('assignedExhibitions', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return paginatedResponse(
      staff.map((s) => s.toJSON()),
      {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      }
    );
  } catch (error: any) {
    logger.error('Error in GET /api/staff:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to list staff'), 500);
  }
}

/**
 * POST /api/staff
 * Create a new staff member. Permission-based access control.
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message || 'Invalid input',
        400,
        { issues: parsed.error.issues }
      );
    }

    const { role, superAdminSecret } = parsed.data;

    // Check super admin secret if creating a super admin
    if (role === 'super_admin') {
      const envSecret = process.env.SUPER_ADMIN_SECRET;
      if (!envSecret) {
        return errorResponse(
          'INTERNAL_ERROR',
          'SUPER_ADMIN_SECRET is not configured on the server.',
          500
        );
      }
      if (!superAdminSecret || !timingSafeStringEqual(superAdminSecret, envSecret)) {
        return errorResponse(
          'FORBIDDEN',
          'Invalid Super Admin Secret Key.',
          403
        );
      }
    }

    // Permission check: can this user create a user with this role?
    if (!StaffService.canCreateRole(currentUser, role)) {
      const roleLabel = role.replace('_', ' ');
      return errorResponse(
        'FORBIDDEN',
        `You do not have permission to create ${roleLabel} users.`,
        403
      );
    }

    // Admin-level permission check: must have canCreateUsers
    if (currentUser.role === 'admin' && !currentUser.permissions?.canCreateUsers) {
      return errorResponse(
        'FORBIDDEN',
        'You do not have permission to create users. Contact your super admin.',
        403
      );
    }

    // Sanitize permissions if created by a regular admin
    if (currentUser.role === 'admin') {
      parsed.data.permissions = {
        canCreateUsers: false,
        canResetPasswords: false,
        canViewAuditLogs: false,
        canManageStaff: false,
        canApproveResets: false,
        canCreateAdmins: false,
        canCreateExhibitions: false,
      };
    }

    // Create the staff member
    const created = await StaffService.create(parsed.data, currentUser.id);

    // Audit log
    await AuditService.create({
      action: 'user.create',
      performedBy: currentUser.id as any,
      performedByRole: currentUser.role,
      targetType: 'user',
      targetId: created.id as any,
      details: {
        staffId: created.staffId,
        name: created.name,
        role: created.role,
        phoneNumber: created.phoneNumber,
        createdByRole: currentUser.role,
      },
    });

    return createdResponse(created);
  } catch (error: any) {
    logger.error('Error in POST /api/staff:', error);

    // Handle duplicate errors
    if (error.code === 11000 || error.message?.includes('already exists')) {
      return errorResponse('DUPLICATE', error.message || 'A staff member with this identifier already exists', 409);
    }

    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to create staff member'), 500);
  }
}
