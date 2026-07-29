import mongoose, { Schema, type Document } from 'mongoose';
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '@/lib/utils/constants';

export interface IAuditLog extends Document {
  action: string;
  performedBy: mongoose.Types.ObjectId;
  performedByRole: string;
  targetType?: string;
  targetId?: mongoose.Types.ObjectId;
  exhibitionId?: mongoose.Types.ObjectId;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: AUDIT_ACTIONS,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByRole: {
      type: String,
      required: true,
      enum: ['super_admin', 'admin', 'counter', 'gate', 'ride'],
    },
    targetType: {
      type: String,
      enum: AUDIT_TARGET_TYPES,
    },
    targetId: {
      type: Schema.Types.ObjectId,
    },
    exhibitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Exhibition',
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
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
        return obj;
      },
    },
  }
);

// Indexes
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ timestamp: -1, _id: -1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, 'details.unauthorizedAttempt': 1, timestamp: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ exhibitionId: 1, timestamp: -1 });

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
