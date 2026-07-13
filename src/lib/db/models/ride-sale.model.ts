import mongoose, { Schema, type Document } from 'mongoose';
import { PAYMENT_METHODS } from '@/lib/utils/constants';

export interface IRideSale extends Document {
  transactionId: string;
  exhibitionId: mongoose.Types.ObjectId;
  rideId: mongoose.Types.ObjectId;
  tickets: mongoose.Types.ObjectId[];
  ticketCount: number;
  totalAmount: number; // in paise
  paymentMethod: string;
  upiTransactionRef?: string;
  soldBy: mongoose.Types.ObjectId;
  soldAt: Date;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentStatus?: 'pending' | 'paid';
  cashReceived?: number; // in paise
  changeGiven?: number; // in paise
}

const RideSaleSchema = new Schema<IRideSale>(
  {
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
    rideId: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
    },
    tickets: [{
      type: Schema.Types.ObjectId,
      ref: 'RideTicket',
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
      enum: ['pending', 'paid'],
      default: 'paid',
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
RideSaleSchema.index({ exhibitionId: 1, soldAt: -1 });
RideSaleSchema.index({ rideId: 1, soldAt: -1 });
RideSaleSchema.index({ soldBy: 1, soldAt: -1 });

export const RideSale =
  mongoose.models.RideSale || mongoose.model<IRideSale>('RideSale', RideSaleSchema);
