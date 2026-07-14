import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { hashPassword } from '@/lib/utils/crypto';
import { SUPER_ADMIN_PERMISSIONS } from '@/lib/config/roles';
import { timingSafeStringEqual } from '@/lib/utils/crypto';
import { logger } from '@/lib/utils/logger';
import type { AuthUser } from '@/types/auth.types';

/**
 * Bootstrap service for first-time super user creation.
 */
export const BootstrapService = {
  /**
   * Check if any super_admin user exists in the database.
   */
  async isSuperUserExists(): Promise<boolean> {
    await connectToDatabase();
    const count = await UserModel.countDocuments({ role: 'super_admin' });
    return count > 0;
  },

  /**
   * Check if bootstrap setup is currently allowed.
   * Bootstrap is allowed when:
   * 1. No super user exists, OR
   * 2. The ALLOW_BOOTSTRAP_OVERRIDE env var is set to 'true'
   */
  async isBootstrapAllowed(): Promise<boolean> {
    const superExists = await this.isSuperUserExists();
    if (!superExists) return true;

    // Allow override via env var (for recovery/re-bootstrap)
    const allowOverride = process.env.ALLOW_BOOTSTRAP_OVERRIDE === 'true';
    return allowOverride;
  },

  /**
   * Create the first super user via bootstrap setup.
   * Validates the bootstrap secret and ensures no duplicate staff IDs.
   */
  async createSuperUser(data: {
    name: string;
    staffId: string;
    phoneNumber: string;
    password: string;
    bootstrapSecret: string;
  }): Promise<AuthUser> {
    await connectToDatabase();

    // 1. Verify bootstrap is allowed
    const allowed = await this.isBootstrapAllowed();
    if (!allowed) {
      throw new Error('Bootstrap setup is no longer available. A super user already exists.');
    }

    // 2. Validate bootstrap secret
    const envSecret = process.env.BOOTSTRAP_SECRET;
    if (!envSecret) {
      throw new Error('BOOTSTRAP_SECRET is not configured on the server.');
    }

    if (!timingSafeStringEqual(data.bootstrapSecret, envSecret)) {
      throw new Error('Invalid bootstrap secret.');
    }

    // 3. Check for duplicate staff ID
    const existing = await UserModel.findOne({ staffId: data.staffId.toUpperCase() });
    if (existing) {
      throw new Error(`Staff ID "${data.staffId}" is already in use.`);
    }

    // 4. Hash password
    const passwordHash = await hashPassword(data.password);

    // 5. Create super user with all permissions
    const mongoose = await import('mongoose');
    const selfId = new mongoose.default.Types.ObjectId();

    const newUser = await UserModel.create({
      _id: selfId,
      staffId: data.staffId.toUpperCase(),
      name: data.name,
      phoneNumber: data.phoneNumber,
      passwordHash,
      role: 'super_admin',
      permissions: { ...SUPER_ADMIN_PERMISSIONS },
      assignedExhibitions: [],
      isActive: true,
      passwordUpdatedAt: new Date(),
      createdBy: selfId, // self-created (bootstrap)
    });

    logger.info(`Bootstrap super user created: ${newUser.staffId}`);

    return {
      id: newUser._id.toString(),
      staffId: newUser.staffId,
      name: newUser.name,
      role: 'super_admin',
      permissions: { ...SUPER_ADMIN_PERMISSIONS },
      assignedExhibitions: [],
      isActive: true,
    };
  },
};
