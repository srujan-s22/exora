import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { comparePassword, signJwt } from '@/lib/utils/crypto';
import { AuditService } from '@/lib/services/audit.service';
import { SUPER_ADMIN_PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS } from '@/lib/config/roles';
import type { LoginCredentials, AuthUser } from '@/types/auth.types';
import type { UserPermissionKey } from '@/lib/config/roles';
import jwt from 'jsonwebtoken';

/**
 * Resolve the effective permissions for a user.
 * Super admins always get all permissions regardless of stored values.
 */
function resolvePermissions(role: string, storedPermissions?: Record<string, boolean>): Record<UserPermissionKey, boolean> {
  if (role === 'super_admin') {
    return { ...SUPER_ADMIN_PERMISSIONS };
  }
  if (role === 'admin' && storedPermissions) {
    return {
      ...DEFAULT_ADMIN_PERMISSIONS,
      ...storedPermissions,
    } as Record<UserPermissionKey, boolean>;
  }
  return { ...DEFAULT_ADMIN_PERMISSIONS };
}

export const AuthService = {
  /**
   * Authenticate a user with staffId and password.
   * Returns the user and JWT token on success.
   */
  async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<{ user: AuthUser; token: string }> {
    await connectToDatabase();

    const staffId = credentials.staffId.trim().toUpperCase();

    // 1. Find user by staffId, explicitly selecting passwordHash since it is hidden by default
    const userDoc = await UserModel.findOne({ staffId }).select('+passwordHash');
    if (!userDoc) {
      throw new Error('Invalid Staff ID or password');
    }

    // 2. Verify active status
    if (!userDoc.isActive) {
      throw new Error('Account is deactivated. Please contact administration.');
    }

    // 3. Compare password hash
    const isPasswordMatch = await comparePassword(credentials.password, userDoc.passwordHash);
    if (!isPasswordMatch) {
      // Create failure audit log
      await AuditService.create({
        action: 'user.login_failed',
        performedBy: userDoc._id.toString(),
        performedByRole: userDoc.role,
        targetType: 'user',
        targetId: userDoc._id.toString(),
        details: { reason: 'Incorrect password', staffId },
        ipAddress,
        userAgent,
      });
      throw new Error('Invalid Staff ID or password');
    }

    // 4. Resolve permissions
    const permissions = resolvePermissions(userDoc.role, (userDoc.permissions as any)?.toObject?.() || userDoc.permissions);

    // 5. Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Server configuration error: JWT secret is missing.');
    }

    const payload = {
      sub: userDoc._id.toString(),
      staffId: userDoc.staffId,
      role: userDoc.role,
      permissions,
      exhibitions: userDoc.assignedExhibitions.map((id: any) => id.toString()),
    };

    const token = signJwt(payload, secret, '8h');

    // 6. Update lastLoginAt, lastLoginIp
    userDoc.lastLoginAt = new Date();
    if (ipAddress) {
      userDoc.lastLoginIp = ipAddress;
    }
    await userDoc.save();

    // 7. Create success audit log
    await AuditService.create({
      action: 'user.login',
      performedBy: userDoc._id.toString(),
      performedByRole: userDoc.role,
      targetType: 'user',
      targetId: userDoc._id.toString(),
      details: { staffId },
      ipAddress,
      userAgent,
    });

    const transformedUser: AuthUser = {
      id: userDoc._id.toString(),
      staffId: userDoc.staffId,
      name: userDoc.name,
      role: userDoc.role,
      permissions,
      assignedExhibitions: userDoc.assignedExhibitions.map((id: any) => id.toString()),
      isActive: userDoc.isActive,
    };

    return { user: transformedUser, token };
  },

  /**
   * Verify an existing JWT token and return the user profile.
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      await connectToDatabase();

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return null;
      }

      const decoded = jwt.verify(token, secret) as any;
      if (!decoded || !decoded.sub) {
        return null;
      }

      const userDoc = await UserModel.findById(decoded.sub);
      if (!userDoc || !userDoc.isActive) {
        return null;
      }

      const permissions = resolvePermissions(userDoc.role, (userDoc.permissions as any)?.toObject?.() || userDoc.permissions);

      return {
        id: userDoc._id.toString(),
        staffId: userDoc.staffId,
        name: userDoc.name,
        role: userDoc.role,
        permissions,
        assignedExhibitions: userDoc.assignedExhibitions.map((id: any) => id.toString()),
        isActive: userDoc.isActive,
      };
    } catch {
      return null;
    }
  },

  /**
   * Get the current authenticated user's full profile.
   */
  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    await connectToDatabase();

    const userDoc = await UserModel.findById(userId);
    if (!userDoc || !userDoc.isActive) {
      return null;
    }

    const permissions = resolvePermissions(userDoc.role, (userDoc.permissions as any)?.toObject?.() || userDoc.permissions);

    return {
      id: userDoc._id.toString(),
      staffId: userDoc.staffId,
      name: userDoc.name,
      role: userDoc.role,
      permissions,
      assignedExhibitions: userDoc.assignedExhibitions.map((id: any) => id.toString()),
      isActive: userDoc.isActive,
    };
  },
};
