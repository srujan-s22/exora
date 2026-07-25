import mongoose, { Schema, type Document } from 'mongoose';
import { PAYMENT_METHODS } from '@/lib/utils/constants';

export interface IRideTicket extends Document {
  ticketNumber: string;
  exhibitionId: mongoose.Types.ObjectId;
  rideId: mongoose.Types.ObjectId;
  ticketType: 'ride';
  price: number; // in paise
  qrPayload: string;
  qrHash: string;
  status: 'valid' | 'partially_used' | 'used' | 'cancelled';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid';
  soldBy: mongoose.Types.ObjectId;
  soldAt: Date;
  usedAt?: Date;
  usedBy?: mongoose.Types.ObjectId;
  scanCount: number;
  quantity: number;
  usedCount: number;
  remainingCount: number;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
}

const RideTicketSchema = new Schema<IRideTicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    exhibitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Exhibition',
      required: true,
    },
    rideId: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
    },
    ticketType: {
      type: String,
      required: true,
      enum: ['ride'],
      default: 'ride',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    qrPayload: {
      type: String,
      required: true,
      unique: true,
    },
    qrHash: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['valid', 'partially_used', 'used', 'cancelled'],
      default: 'valid',
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    usedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    remainingCount: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'paid'],
      default: 'paid',
    },
    soldBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    soldAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    usedAt: Date,
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    scanCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
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
RideTicketSchema.index({ qrHash: 1 });
RideTicketSchema.index({ exhibitionId: 1, rideId: 1, status: 1 });
RideTicketSchema.index({ rideId: 1, soldAt: -1 });
RideTicketSchema.index({ soldBy: 1, soldAt: -1 });

if (mongoose.models && mongoose.models.RideTicket) {
  delete (mongoose.models as any).RideTicket;
}

export const RideTicket = mongoose.model<IRideTicket>('RideTicket', RideTicketSchema);
