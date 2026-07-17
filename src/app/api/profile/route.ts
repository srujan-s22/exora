import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { User as UserModel } from '@/lib/db/models/user.model';
import { AuthService } from '@/lib/services/auth.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { z } from 'zod';
import { hashPassword, comparePassword } from '@/lib/utils/crypto';
import { AuditService } from '@/lib/services/audit.service';
import { safeErrorMessage } from '@/lib/utils/sanitize';

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  currentPassword: z.string().min(1, 'Current password is required when changing password').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .optional(),
}).refine(
  (data) => {
    // If password is provided, currentPassword must also be provided
    if (data.password && !data.currentPassword) return false;
    return true;
  },
  { message: 'Current password is required when setting a new password', path: ['currentPassword'] }
);

/**
 * GET /api/profile
 * Retrieve current user's profile details.
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
    if (!currentUser) {
      return errorResponse('UNAUTHORIZED', 'Invalid session', 401);
    }

    const user = await UserModel.findById(currentUser.id)
      .select('name staffId email role isSuperAdmin isActive assignedExhibitions createdAt updatedAt')
      .populate('assignedExhibitions', 'name status');

    if (!user) {
      return errorResponse('NOT_FOUND', 'User profile not found', 404);
    }

    return successResponse(user.toJSON());
  } catch (error: any) {
    logger.error('Error in GET /api/profile:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to fetch profile'), 500);
  }
}

/**
 * PATCH /api/profile
 * Update current user's profile info.
 */
export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message || 'Invalid input',
        400,
        { issues: parsed.error.issues }
      );
    }

    const user = await UserModel.findById(currentUser.id);
    if (!user) {
      return errorResponse('NOT_FOUND', 'User profile not found', 404);
    }

    const updates = parsed.data;
    const changes: Record<string, { from: any; to: any }> = {};

    if (updates.name !== undefined && updates.name !== user.name) {
      changes.name = { from: user.name, to: updates.name };
      user.name = updates.name;
    }

    if (updates.email !== undefined) {
      const newEmail = updates.email || undefined;
      if (newEmail !== user.email) {
        if (newEmail) {
          const existingEmail = await UserModel.findOne({
            email: newEmail.toLowerCase(),
            _id: { $ne: currentUser.id },
          });
          if (existingEmail) {
            return errorResponse('DUPLICATE', 'A user with this email already exists', 409);
          }
        }
        changes.email = { from: user.email, to: newEmail };
        user.email = newEmail as any;
      }
    }

    if (updates.password) {
      // Verify current password before allowing change
      const userWithHash = await UserModel.findById(currentUser.id).select('+passwordHash');
      if (!userWithHash) {
        return errorResponse('NOT_FOUND', 'User profile not found', 404);
      }
      const isCurrentPasswordValid = await comparePassword(updates.currentPassword!, userWithHash.passwordHash);
      if (!isCurrentPasswordValid) {
        return errorResponse('INVALID_PASSWORD', 'Current password is incorrect', 403);
      }
      user.passwordHash = await hashPassword(updates.password);
      changes.password = { from: '***', to: '***' };
    }

    if (Object.keys(changes).length > 0) {
      await user.save();

      // Audit log
      await AuditService.create({
        action: 'user.update',
        performedBy: currentUser.id as any,
        performedByRole: currentUser.role,
        targetType: 'user',
        targetId: user._id.toString(),
        details: { changes, selfUpdated: true },
      });
    }

    const updatedUser = await UserModel.findById(currentUser.id)
      .select('name staffId email role isSuperAdmin isActive assignedExhibitions createdAt updatedAt')
      .populate('assignedExhibitions', 'name status');

    return successResponse(updatedUser?.toJSON());
  } catch (error: any) {
    logger.error('Error in PATCH /api/profile:', error);
    if (error.code === 11000) {
      return errorResponse('DUPLICATE', 'A user with this email already exists', 409);
    }
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to update profile'), 500);
  }
}
