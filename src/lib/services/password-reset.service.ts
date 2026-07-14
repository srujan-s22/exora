import { User as UserModel } from '@/lib/db/models/user.model';
import { PasswordResetRequest } from '@/lib/db/models/password-reset-request.model';
import { connectToDatabase } from '@/lib/db/connection';
import { hashPassword, generateRandomToken } from '@/lib/utils/crypto';
import type { PaginationParams, PaginationMeta } from '@/types/api.types';
import type { PasswordResetRequest as PasswordResetRequestType } from '@/types/password-reset.types';

/**
 * Password reset request service.
 * Handles the full lifecycle: create → approve/reject → complete.
 */
export const PasswordResetService = {
  /**
   * Create a new password reset request.
   * Validates the phone number matches a real user.
   */
  async createRequest(
    requestedById: string,
    targetPhoneNumber: string
  ): Promise<PasswordResetRequestType> {
    await connectToDatabase();

    // 1. Find the target user by phone number
    const targetUser = await UserModel.findOne({ phoneNumber: targetPhoneNumber, isActive: true });
    if (!targetUser) {
      throw new Error('No active staff member found with this phone number.');
    }

    // 1.5. Prevent requesting password reset for super admins
    if (targetUser.role === 'super_admin') {
      throw new Error('TARGET_IS_SUPER_ADMIN');
    }

    // 2. Check for existing pending request for same user
    const existingPending = await PasswordResetRequest.findOne({
      targetUserId: targetUser._id,
      status: 'pending',
    });
    if (existingPending) {
      throw new Error('A password reset request is already pending for this staff member.');
    }

    // 3. Create the request
    const request = await PasswordResetRequest.create({
      requestedBy: requestedById,
      targetUserId: targetUser._id,
      targetStaffId: targetUser.staffId,
      targetPhoneNumber,
      status: 'pending',
      requestedAt: new Date(),
    });

    // Populate and return
    const populated = await PasswordResetRequest.findById(request._id)
      .populate('requestedBy', 'name staffId')
      .populate('targetUserId', 'name staffId');

    return this._toJson(populated!);
  },

  /**
   * List password reset requests with pagination and filters.
   */
  async listRequests(
    params: PaginationParams & {
      status?: string;
      requestedBy?: string;
    }
  ): Promise<{ data: PasswordResetRequestType[]; pagination: PaginationMeta }> {
    await connectToDatabase();

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (params.status) query.status = params.status;
    if (params.requestedBy) query.requestedBy = params.requestedBy;

    const total = await PasswordResetRequest.countDocuments(query);
    const requests = await PasswordResetRequest.find(query)
      .populate('requestedBy', 'name staffId')
      .populate('targetUserId', 'name staffId')
      .populate('approvedBy', 'name staffId')
      .populate('rejectedBy', 'name staffId')
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: requests.map((r) => this._toJson(r)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  /**
   * Get a single request by ID.
   */
  async getRequestById(requestId: string): Promise<PasswordResetRequestType | null> {
    await connectToDatabase();

    const request = await PasswordResetRequest.findById(requestId)
      .populate('requestedBy', 'name staffId')
      .populate('targetUserId', 'name staffId')
      .populate('approvedBy', 'name staffId')
      .populate('rejectedBy', 'name staffId');

    if (!request) return null;
    return this._toJson(request);
  },

  /**
   * Approve a password reset request.
   * Super Admin only. Sets request status to 'approved' but does not set password.
   */
  async approveRequest(
    requestId: string,
    approvedById: string
  ): Promise<{ request: PasswordResetRequestType }> {
    await connectToDatabase();

    const request = await PasswordResetRequest.findById(requestId);
    if (!request) {
      throw new Error('Password reset request not found.');
    }
    if (request.status !== 'pending') {
      throw new Error(`Cannot approve a request that is already ${request.status}.`);
    }

    // Update the request status
    request.status = 'approved';
    request.approvedBy = approvedById as any;
    request.actionTakenAt = new Date();
    await request.save();

    const populated = await PasswordResetRequest.findById(requestId)
      .populate('requestedBy', 'name staffId')
      .populate('targetUserId', 'name staffId')
      .populate('approvedBy', 'name staffId');

    return {
      request: this._toJson(populated!),
    };
  },

  /**
   * Complete a password reset request.
   * Admin sets the new password for the target user.
   */
  async completeRequest(
    requestId: string,
    completedById: string,
    newPassword: string
  ): Promise<PasswordResetRequestType> {
    await connectToDatabase();

    const request = await PasswordResetRequest.findById(requestId);
    if (!request) {
      throw new Error('Password reset request not found.');
    }
    if (request.status !== 'approved') {
      throw new Error(`Cannot complete a request that is in ${request.status} status. It must be approved first.`);
    }

    // Hash and update the password
    const newPasswordHash = await hashPassword(newPassword);
    const targetUser = await UserModel.findById(request.targetUserId).select('+passwordHash');
    if (!targetUser) {
      throw new Error('Target user no longer exists.');
    }

    targetUser.passwordHash = newPasswordHash;
    targetUser.passwordUpdatedAt = new Date();
    await targetUser.save();

    // Mark request as completed
    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();

    const populated = await PasswordResetRequest.findById(requestId)
      .populate('requestedBy', 'name staffId')
      .populate('targetUserId', 'name staffId')
      .populate('approvedBy', 'name staffId');

    return this._toJson(populated!);
  },

  /**
   * Reject a password reset request.
   */
  async rejectRequest(
    requestId: string,
    rejectedById: string,
    reason?: string
  ): Promise<PasswordResetRequestType> {
    await connectToDatabase();

    const request = await PasswordResetRequest.findById(requestId);
    if (!request) {
      throw new Error('Password reset request not found.');
    }
    if (request.status !== 'pending') {
      throw new Error(`Cannot reject a request that is already ${request.status}.`);
    }

    request.status = 'rejected';
    request.rejectedBy = rejectedById as any;
    request.reason = reason || undefined;
    request.actionTakenAt = new Date();
    await request.save();

    const populated = await PasswordResetRequest.findById(requestId)
      .populate('requestedBy', 'name staffId')
      .populate('targetUserId', 'name staffId')
      .populate('rejectedBy', 'name staffId');

    return this._toJson(populated!);
  },

  /**
   * Generate a secure random password.
   * Guaranteed to have uppercase, lowercase, digit, and special char.
   */
  _generateSecurePassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '@#$%&*!';
    const all = upper + lower + digits + special;

    // Ensure at least one of each required type
    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill remaining with random chars
    for (let i = 4; i < 12; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  },

  /**
   * Convert a mongoose doc to a typed JSON object.
   */
  _toJson(doc: any): PasswordResetRequestType {
    const json = doc.toJSON ? doc.toJSON() : doc;
    return {
      id: json.id || json._id?.toString(),
      requestedBy: json.requestedBy?.id || json.requestedBy?.toString(),
      requestedByName: json.requestedBy?.name,
      requestedByStaffId: json.requestedBy?.staffId,
      targetUserId: json.targetUserId?.id || json.targetUserId?.toString(),
      targetStaffId: json.targetStaffId,
      targetName: json.targetUserId?.name,
      targetPhoneNumber: json.targetPhoneNumber,
      status: json.status,
      approvedBy: json.approvedBy?.id || json.approvedBy?.toString(),
      rejectedBy: json.rejectedBy?.id || json.rejectedBy?.toString(),
      reason: json.reason,
      notes: json.notes,
      requestedAt: json.requestedAt,
      actionTakenAt: json.actionTakenAt,
      completedAt: json.completedAt,
    };
  },
};
