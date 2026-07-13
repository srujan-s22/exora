import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { User as UserModel } from '@/lib/db/models/user.model';
import { AuthService } from '@/lib/services/auth.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse, createdResponse, paginatedResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME, STAFF_ID_PREFIXES } from '@/lib/utils/constants';
import { createStaffSchema } from '@/lib/validators/staff.schema';
import { hashPassword, timingSafeStringEqual } from '@/lib/utils/crypto';
import { AuditService } from '@/lib/services/audit.service';
import { escapeRegex, safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * GET /api/staff
 * Retrieve a paginated, filterable list of staff members. Admin only.
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
    if (!user || user.role !== 'admin') {
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

    // Search by name or staffId (sanitize to prevent ReDoS)
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { staffId: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const total = await UserModel.countDocuments(query);
    const staff = await UserModel.find(query)
      .select('name staffId email role isSuperAdmin isActive assignedExhibitions lastLoginAt createdAt')
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
 * Generate the next sequential staff ID for a given role.
 * Format: PREFIX-NNN (e.g. CTR-001, GTE-002, ADM-003)
 */
async function generateStaffId(role: keyof typeof STAFF_ID_PREFIXES): Promise<string> {
  const prefix = STAFF_ID_PREFIXES[role];

  // Find the highest existing number for this prefix
  const latest = await UserModel.findOne({ staffId: { $regex: `^${prefix}-` } })
    .sort({ staffId: -1 })
    .select('staffId');

  let nextNum = 1;
  if (latest?.staffId) {
    const parts = latest.staffId.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * POST /api/staff
 * Create a new staff member. Admin only.
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
    if (!currentUser || currentUser.role !== 'admin') {
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

    const { name, email, role, password, assignedExhibitions } = parsed.data;
    const superAdminSecret = body.superAdminSecret as string | undefined;

    // Check for duplicate email if provided
    if (email && email.length > 0) {
      const existingEmail = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return errorResponse('DUPLICATE', 'A staff member with this email already exists', 409);
      }
    }

    // Generate staff ID
    const staffId = await generateStaffId(role as keyof typeof STAFF_ID_PREFIXES);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Determine super admin status
    let isSuperAdmin = false;
    if (role === 'admin' && superAdminSecret) {
      const envSecret = process.env.SUPER_ADMIN_SECRET;
      if (!envSecret) {
        return errorResponse('CONFIG_ERROR', 'Super admin secret is not configured on the server', 500);
      }
      if (!timingSafeStringEqual(superAdminSecret, envSecret)) {
        return errorResponse('INVALID_SECRET', 'Incorrect super admin secret', 403);
      }
      isSuperAdmin = true;
    }

    // Create the user
    const newUser = await UserModel.create({
      staffId,
      name,
      email: email || undefined,
      passwordHash,
      role,
      isSuperAdmin,
      assignedExhibitions: assignedExhibitions || [],
      isActive: true,
      createdBy: currentUser.id,
    });

    // Audit log
    await AuditService.create({
      action: 'user.create',
      performedBy: currentUser.id as any,
      performedByRole: currentUser.role,
      targetType: 'user',
      targetId: newUser._id,
      details: { staffId, name, role, isSuperAdmin },
    });

    // Return the created user (without passwordHash)
    const created = await UserModel.findById(newUser._id)
      .select('name staffId email role isSuperAdmin isActive assignedExhibitions createdAt')
      .populate('assignedExhibitions', 'name');

    return createdResponse(created?.toJSON());
  } catch (error: any) {
    logger.error('Error in POST /api/staff:', error);

    // Handle mongoose duplicate key errors
    if (error.code === 11000) {
      return errorResponse('DUPLICATE', 'A staff member with this identifier already exists', 409);
    }

    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to create staff member'), 500);
  }
}
