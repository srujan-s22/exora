import mongoose, { Schema, type Document } from 'mongoose';
import type { UserRoleType } from '@/lib/config/roles';

export interface IUser extends Document {
  staffId: string;
  name: string;
  email?: string;
  passwordHash: string;
  role: UserRoleType;
  isSuperAdmin: boolean;
  assignedExhibitions: mongoose.Types.ObjectId[];
  isActive: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
      enum: ['admin', 'counter', 'gate'],
    },
    assignedExhibitions: [{
      type: Schema.Types.ObjectId,
      ref: 'Exhibition',
    }],
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: Date,
    lastLoginIp: String,
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

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
