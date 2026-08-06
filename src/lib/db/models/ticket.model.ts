import mongoose, { Schema, type Document } from 'mongoose';
import { TICKET_STATUSES, PAYMENT_METHODS } from '@/lib/utils/constants';

export interface ITicket extends Document {
  ticketNumber: string;
  exhibitionId: mongoose.Types.ObjectId;
  ticketType: string;
  price: number; // in paise
  qrPayload: string;
  qrHash: string;
  status: string;
  scanCount: number;
  quantity: number;
  usedCount: number;
  remainingCount: number;
  soldBy: mongoose.Types.ObjectId;
  soldAt: Date;
  usedAt?: Date;
  usedBy?: mongoose.Types.ObjectId;
  paymentMethod: string;
  paymentStatus: string;
  source: string;
  createdBy?: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
  cancellationStatus?: 'pending' | 'approved' | 'rejected' | null;
  createdAt: Date;
  updatedAt?: Date;
}

const TicketSchema = new Schema<ITicket>(
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
    ticketType: {
      type: String,
      required: true,
      trim: true,
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
      enum: TICKET_STATUSES,
      default: 'valid',
    },
    scanCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
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
    paymentMethod: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'free'],
      default: 'paid',
    },
    source: {
      type: String,
      required: true,
      enum: ['admin', 'counter'],
      default: 'counter',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    cancellationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', null],
      default: null,
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

// Indexes — qrHash is the primary hot-path for scan validation
TicketSchema.index({ qrHash: 1 });
TicketSchema.index({ exhibitionId: 1, status: 1 });
TicketSchema.index({ exhibitionId: 1, soldAt: -1 });
TicketSchema.index({ soldBy: 1, soldAt: -1 });
TicketSchema.index({ exhibitionId: 1, paymentMethod: 1 });

if (mongoose.models && mongoose.models.Ticket) {
  delete (mongoose.models as any).Ticket;
}

export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
