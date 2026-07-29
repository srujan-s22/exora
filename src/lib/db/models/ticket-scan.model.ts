import mongoose, { Schema, type Document } from 'mongoose';
import { SCAN_RESULTS } from '@/lib/utils/constants';

export interface ITicketScan extends Document {
  ticketId?: mongoose.Types.ObjectId;
  exhibitionId: mongoose.Types.ObjectId;
  scannedBy: mongoose.Types.ObjectId;
  scannedAt: Date;
  result: string;
  qrPayloadRaw: string;
  reason?: string;
  ticketStatusBefore?: string;
  ticketStatusAfter?: string;
  admittedCount?: number;
  previousUsedCount?: number;
  newUsedCount?: number;
  previousRemainingCount?: number;
  newRemainingCount?: number;
  deviceInfo?: string;
  gateId?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

const TicketScanSchema = new Schema<ITicketScan>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    admittedCount: {
      type: Number,
      default: 1,
    },
    previousUsedCount: Number,
    newUsedCount: Number,
    previousRemainingCount: Number,
    newRemainingCount: Number,
    exhibitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Exhibition',
      required: true,
    },
    scannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scannedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    result: {
      type: String,
      required: true,
      enum: SCAN_RESULTS,
    },
    qrPayloadRaw: {
      type: String,
      required: true,
    },
    reason: String,
    ticketStatusBefore: String,
    ticketStatusAfter: String,
    deviceInfo: String,
    gateId: String,
    location: {
      type: new Schema(
        {
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
        },
        { _id: false }
      ),
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
TicketScanSchema.index({ ticketId: 1, scannedAt: -1 });
TicketScanSchema.index({ scannedBy: 1, scannedAt: -1 });
TicketScanSchema.index({ exhibitionId: 1, scannedAt: -1 });
TicketScanSchema.index({ exhibitionId: 1, result: 1 });
TicketScanSchema.index({ scannedAt: -1, _id: -1 });
TicketScanSchema.index({ result: 1, scannedAt: -1 });

if (mongoose.models && mongoose.models.TicketScan) {
  delete (mongoose.models as any).TicketScan;
}

export const TicketScan = mongoose.model<ITicketScan>('TicketScan', TicketScanSchema);
