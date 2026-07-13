import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import type { Staff, CreateStaffInput, UpdateStaffInput } from '@/types/staff.types';
import type { PaginationParams, PaginationMeta } from '@/types/api.types';

/**
 * Staff management service.
 * Read operations are fully implemented. Write operations will be available in a future release.
 */
export const StaffService = {
  async create(_data: CreateStaffInput, _createdBy: string): Promise<Staff> {
    throw new Error('Staff creation is not yet available. Use the admin setup script to create staff accounts.');
  },

  async findById(id: string): Promise<Staff | null> {
    await connectToDatabase();
    const user = await UserModel.findById(id)
      .select('name staffId role assignedExhibitions isActive lastLoginAt createdAt');

    if (!user) return null;

    return {
      id: user._id.toString(),
      staffId: user.staffId,
      name: user.name,
      role: user.role,
      assignedExhibitions: user.assignedExhibitions?.map((id: any) => id.toString()) || [],
      isActive: user.isActive,
    } as Staff;
  },

  async update(_id: string, _data: UpdateStaffInput, _updatedBy: string): Promise<Staff | null> {
    throw new Error('Staff editing is not yet available.');
  },

  async deactivate(_id: string, _deactivatedBy: string): Promise<Staff | null> {
    throw new Error('Staff deactivation is not yet available.');
  },

  async list(params: PaginationParams & { role?: string; isActive?: boolean }): Promise<{ data: Staff[]; pagination: PaginationMeta }> {
    await connectToDatabase();

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (params.role) query.role = params.role;
    if (params.isActive !== undefined) query.isActive = params.isActive;

    const total = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
      .select('name staffId role assignedExhibitions isActive lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((u) => ({
        id: u._id.toString(),
        staffId: u.staffId,
        name: u.name,
        role: u.role,
        assignedExhibitions: u.assignedExhibitions?.map((id: any) => id.toString()) || [],
        isActive: u.isActive,
      })) as Staff[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },
};
