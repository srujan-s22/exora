import mongoose, { Schema, type Document } from 'mongoose';
import type { UserRoleType, UserPermissionKey } from '@/lib/config/roles';

export interface IUserPermissions {
  canCreateUsers: boolean;
  canResetPasswords: boolean;
  canViewAuditLogs: boolean;
  canManageStaff: boolean;
  canApproveResets: boolean;
  canCreateAdmins: boolean;
}

export interface IUser extends Document {
  staffId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  passwordHash: string;
  role: UserRoleType;
  permissions: IUserPermissions;
  assignedExhibitions: mongoose.Types.ObjectId[];
  isActive: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordUpdatedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionsSchema = new Schema(
  {
    canCreateUsers: { type: Boolean, default: false },
    canResetPasswords: { type: Boolean, default: false },
    canViewAuditLogs: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
    canApproveResets: { type: Boolean, default: false },
    canCreateAdmins: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default
    },
    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'admin', 'counter', 'gate', 'ride'],
    },
    permissions: {
      type: PermissionsSchema,
      default: () => ({
        canCreateUsers: false,
        canResetPasswords: false,
        canViewAuditLogs: false,
        canManageStaff: false,
        canApproveResets: false,
        canCreateAdmins: false,
      }),
    },
    assignedExhibitions: [{
      type: Schema.Types.ObjectId,
      ref: 'Exhibition',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: Date,
    lastLoginIp: String,
    passwordUpdatedAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const obj = ret as Record<string, any>;
        if (obj._id) {
          obj.id = obj._id.toString();
          delete obj._id;
        }
        delete obj.__v;
        delete obj.passwordHash;
        return obj;
      },
    },
  }
);

// Indexes
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ assignedExhibitions: 1 });
UserSchema.index({ phoneNumber: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
