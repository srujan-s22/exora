import mongoose, { Schema, type Document } from 'mongoose';

export type PasswordResetStatusType = 'pending' | 'approved' | 'rejected' | 'completed';

export interface IPasswordResetRequest extends Document {
  requestedBy: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  targetStaffId: string;
  targetPhoneNumber: string;
  status: PasswordResetStatusType;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  reason?: string;
  notes?: string;
  /** The generated password hash (stored only after approval) */
  newPasswordHash?: string;
  requestedAt: Date;
  actionTakenAt?: Date;
  completedAt?: Date;
}

const PasswordResetRequestSchema = new Schema<IPasswordResetRequest>(
  {
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetStaffId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    targetPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    newPasswordHash: {
      type: String,
      select: false, // never returned by default
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    actionTakenAt: Date,
    completedAt: Date,
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        const obj = ret as Record<string, any>;
        if (obj._id) {
          obj.id = obj._id.toString();
          delete obj._id;
        }
        delete obj.__v;
        delete obj.newPasswordHash;
        return obj;
      },
    },
  }
);

// Indexes
PasswordResetRequestSchema.index({ status: 1, requestedAt: -1 });
PasswordResetRequestSchema.index({ requestedBy: 1, requestedAt: -1 });
PasswordResetRequestSchema.index({ targetUserId: 1, status: 1 });
PasswordResetRequestSchema.index({ targetPhoneNumber: 1 });

export const PasswordResetRequest =
  mongoose.models.PasswordResetRequest ||
  mongoose.model<IPasswordResetRequest>('PasswordResetRequest', PasswordResetRequestSchema);
