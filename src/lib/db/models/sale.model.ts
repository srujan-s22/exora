import mongoose, { Schema, type Document } from 'mongoose';
import { PAYMENT_METHODS } from '@/lib/utils/constants';

export interface ISale extends Document {
  transactionId: string;
  exhibitionId: mongoose.Types.ObjectId;
  tickets: mongoose.Types.ObjectId[];
  ticketCount: number;
  totalAmount: number; // in paise
  paymentMethod: string;
  upiTransactionRef?: string;
  soldBy: mongoose.Types.ObjectId;
  soldAt: Date;
  shiftId?: string;
  ticketType?: string;
  unitPrice?: number; // in paise
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentStatus?: 'pending' | 'paid' | 'free';
  cashReceived?: number; // in paise
  changeGiven?: number; // in paise
  status?: 'active' | 'cancelled';
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelReason?: string;
  cancellationWindowSeconds?: number;
}

const SaleSchema = new Schema<ISale>(
  {
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      required: true,
    },
    cancelledAt: Date,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelReason: String,
    cancellationWindowSeconds: {
      type: Number,
      default: 30,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    exhibitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Exhibition',
      required: true,
    },
    tickets: [{
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    }],
    ticketCount: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS,
    },
    upiTransactionRef: {
      type: String,
      trim: true,
    },
    ticketType: {
      type: String,
    },
    unitPrice: {
      type: Number,
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
    notes: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'free'],
    },
    cashReceived: {
      type: Number,
      min: 0,
    },
    changeGiven: {
      type: Number,
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
    shiftId: String,
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
SaleSchema.index({ exhibitionId: 1, soldAt: -1 });
SaleSchema.index({ soldBy: 1, soldAt: -1 });
SaleSchema.index({ exhibitionId: 1, paymentMethod: 1 });

export const Sale =
  mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);
