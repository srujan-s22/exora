import mongoose, { Schema, type Document } from 'mongoose';

export interface ICancellationRequest extends Document {
  requestId: string;
  saleId: mongoose.Types.ObjectId;
  saleType: 'entry' | 'ride';
  exhibitionId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  cancellationReason: string;
  note?: string;
  rejectionReason?: string;
  requestedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  originalSaleAmount: number; // in paise
  ticketCount: number;
  requestWindowSeconds: number;
}

const CancellationRequestSchema = new Schema<ICancellationRequest>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    saleId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    saleType: {
      type: String,
      required: true,
      enum: ['entry', 'ride'],
      default: 'entry',
    },
    exhibitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Exhibition',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    cancellationReason: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    reviewedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    originalSaleAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    ticketCount: {
      type: Number,
      required: true,
      min: 1,
    },
    requestWindowSeconds: {
      type: Number,
      required: true,
      default: 30,
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

CancellationRequestSchema.index({ saleId: 1, status: 1 });
CancellationRequestSchema.index({ exhibitionId: 1, status: 1 });
CancellationRequestSchema.index({ status: 1, requestedAt: -1 });

export const CancellationRequest =
  mongoose.models.CancellationRequest ||
  mongoose.model<ICancellationRequest>('CancellationRequest', CancellationRequestSchema);
