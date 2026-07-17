import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { hashPassword } from '@/lib/utils/crypto';
import { STAFF_ID_PREFIXES } from '@/lib/utils/constants';
import { CREATABLE_ROLES, DEFAULT_ADMIN_PERMISSIONS, SUPER_ADMIN_PERMISSIONS } from '@/lib/config/roles';
import type { Staff, CreateStaffInput, UpdateStaffInput } from '@/types/staff.types';
import type { PaginationParams, PaginationMeta } from '@/types/api.types';
import type { AuthUser } from '@/types/auth.types';
import type { UserRoleType, UserPermissionKey } from '@/lib/config/roles';
import { escapeRegex } from '@/lib/utils/sanitize';

/**
 * Generate the next sequential staff ID for a given role.
 * Format: PREFIX-NNN (e.g. CTR-001, GTE-002, SUA-001)
 */
async function generateStaffId(role: keyof typeof STAFF_ID_PREFIXES): Promise<string> {
  const prefix = STAFF_ID_PREFIXES[role];

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
 * Staff management service.
 */
export const StaffService = {
  /**
   * Check if the current user is allowed to create a user with the given role.
   */
  canCreateRole(currentUser: AuthUser, targetRole: UserRoleType): boolean {
    // Super admins can create any role
    if (currentUser.role === 'super_admin') return true;

    // Admins need canCreateUsers permission
    if (currentUser.role === 'admin') {
      if (!currentUser.permissions?.canCreateUsers) return false;

      // Check base creatable roles
      const baseAllowed = CREATABLE_ROLES['admin'];
      if (baseAllowed.includes(targetRole)) return true;

      // Admin can create other admins only if canCreateAdmins is true
      if (targetRole === 'admin' && currentUser.permissions?.canCreateAdmins) return true;

      return false;
    }

    return false;
  },

  /**
   * Get the list of roles the current user can create.
   */
  getCreatableRoles(currentUser: AuthUser): UserRoleType[] {
    if (currentUser.role === 'super_admin') {
      return CREATABLE_ROLES['super_admin'];
    }

    if (currentUser.role === 'admin' && currentUser.permissions?.canCreateUsers) {
      const roles = [...CREATABLE_ROLES['admin']];
      if (currentUser.permissions?.canCreateAdmins) {
        roles.push('admin');
      }
      return roles;
    }

    return [];
  },

  /**
   * Create a new staff member.
   */
  async create(data: CreateStaffInput, createdBy: string): Promise<Staff> {
    await connectToDatabase();

    // Generate staff ID
    const staffId = await generateStaffId(data.role as keyof typeof STAFF_ID_PREFIXES);

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Determine permissions based on role
    let permissions;
    if (data.role === 'super_admin') {
      permissions = { ...SUPER_ADMIN_PERMISSIONS };
    } else if (data.role === 'admin') {
      permissions = {
        ...DEFAULT_ADMIN_PERMISSIONS,
        ...(data.permissions || {}),
      };
    } else {
      permissions = { ...DEFAULT_ADMIN_PERMISSIONS };
    }

    // Check for duplicate phone number
    const existingPhone = await UserModel.findOne({ phoneNumber: data.phoneNumber });
    if (existingPhone) {
      throw new Error('A staff member with this phone number already exists.');
    }

    // Check for duplicate email
    if (data.email && data.email.length > 0) {
      const existingEmail = await UserModel.findOne({ email: data.email.toLowerCase() });
      if (existingEmail) {
        throw new Error('A staff member with this email already exists.');
      }
    }

    // Create user
    const newUser = await UserModel.create({
      staffId,
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email || undefined,
      passwordHash,
      role: data.role,
      permissions,
      assignedExhibitions: data.assignedExhibitions || [],
      isActive: true,
      passwordUpdatedAt: new Date(),
      createdBy,
    });

    // Return without password
    const created = await UserModel.findById(newUser._id)
      .select('name staffId phoneNumber email role permissions isActive assignedExhibitions createdBy createdAt updatedAt')
      .populate('assignedExhibitions', 'name');

    return this._toStaff(created!);
  },

  async findById(id: string): Promise<Staff | null> {
    await connectToDatabase();
    const user = await UserModel.findById(id)
      .select('name staffId phoneNumber email role permissions assignedExhibitions isActive lastLoginAt createdBy createdAt updatedAt');

    if (!user) return null;
    return this._toStaff(user);
  },

  async update(id: string, data: UpdateStaffInput, updatedBy: string): Promise<Staff | null> {
    await connectToDatabase();

    const user = await UserModel.findById(id).select('+passwordHash');
    if (!user) return null;

    if (data.name !== undefined) user.name = data.name;
    if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;
    if (data.email !== undefined) user.email = data.email || (undefined as any);
    if (data.role !== undefined) user.role = data.role;
    if (data.assignedExhibitions !== undefined) user.assignedExhibitions = data.assignedExhibitions as any;
    if (data.isActive !== undefined) user.isActive = data.isActive;

    if (data.password) {
      user.passwordHash = await hashPassword(data.password);
      user.passwordUpdatedAt = new Date();
    }

    await user.save();

    const updated = await UserModel.findById(id)
      .select('name staffId phoneNumber email role permissions assignedExhibitions isActive lastLoginAt createdBy createdAt updatedAt');

    return this._toStaff(updated!);
  },

  async deactivate(id: string, deactivatedBy: string): Promise<Staff | null> {
    await connectToDatabase();

    const user = await UserModel.findById(id);
    if (!user) return null;

    user.isActive = false;
    await user.save();

    return this._toStaff(user);
  },

  /**
   * Update an admin's permissions. Super admin only.
   */
  async updatePermissions(
    id: string,
    permissions: Partial<Record<UserPermissionKey, boolean>>
  ): Promise<Staff | null> {
    await connectToDatabase();

    const user = await UserModel.findById(id);
    if (!user) return null;
    if (user.role !== 'admin') {
      throw new Error('Permissions can only be set on admin users.');
    }

    // Merge with existing permissions
    const currentPerms = (user.permissions as any)?.toObject?.() || user.permissions || {};
    const updatedPerms = {
      ...DEFAULT_ADMIN_PERMISSIONS,
      ...currentPerms,
      ...permissions,
    };

    user.permissions = updatedPerms as any;
    await user.save();

    const updated = await UserModel.findById(id)
      .select('name staffId phoneNumber email role permissions assignedExhibitions isActive lastLoginAt createdBy createdAt updatedAt');

    return this._toStaff(updated!);
  },

  async list(params: PaginationParams & { role?: string; isActive?: boolean; search?: string }): Promise<{ data: Staff[]; pagination: PaginationMeta }> {
    await connectToDatabase();

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (params.role) query.role = params.role;
    if (params.isActive !== undefined) query.isActive = params.isActive;

    if (params.search) {
      const safeSearch = escapeRegex(params.search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { staffId: { $regex: safeSearch, $options: 'i' } },
        { phoneNumber: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const total = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
      .select('name staffId phoneNumber email role permissions isActive assignedExhibitions lastLoginAt createdBy createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((u) => this._toStaff(u)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  _toStaff(user: any): Staff {
    return {
      id: user._id.toString(),
      staffId: user.staffId,
      name: user.name,
      phoneNumber: user.phoneNumber || '',
      email: user.email,
      role: user.role,
      permissions: user.permissions?.toObject?.() || user.permissions,
      assignedExhibitions: user.assignedExhibitions?.map((id: any) => id.toString()) || [],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdBy: user.createdBy?.toString(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    } as Staff;
  },
};
