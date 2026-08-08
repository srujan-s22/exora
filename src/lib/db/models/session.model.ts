import mongoose, { Schema, type Document } from 'mongoose';

export interface ISession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  role: string;
  deviceName: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  ipAddress?: string;
  userAgent?: string;
  locationLabel: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokeReason?: string;
  isRevoked: boolean;
  loginMethod: string;
  authVersion: number;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    browserName: {
      type: String,
      default: 'Unknown Browser',
    },
    browserVersion: {
      type: String,
      default: '',
    },
    osName: {
      type: String,
      default: 'Unknown OS',
    },
    osVersion: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    locationLabel: {
      type: String,
      default: 'Local Network',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: Date,
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    revokeReason: String,
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    loginMethod: {
      type: String,
      default: 'credentials',
    },
    authVersion: {
      type: Number,
      default: 1,
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

// Compound indexes for high-throughput session queries
SessionSchema.index({ userId: 1, isRevoked: 1, expiresAt: 1 });
SessionSchema.index({ sessionId: 1, isRevoked: 1 });
SessionSchema.index({ isRevoked: 1, lastSeenAt: -1 });

export const Session =
  mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
