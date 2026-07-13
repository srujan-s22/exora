import mongoose, { Schema, type Document } from 'mongoose';

export interface IRideScan extends Document {
  ticketId?: mongoose.Types.ObjectId;
  rideId: mongoose.Types.ObjectId;
  exhibitionId: mongoose.Types.ObjectId;
  scannedBy: mongoose.Types.ObjectId;
  scannedAt: Date;
  result: 'admitted' | 'rejected_used' | 'rejected_wrong_ride' | 'rejected_invalid' | 'rejected_unknown' | 'rejected_closed';
  qrPayloadRaw: string;
  reason?: string;
  gateId?: string;
}

const RideScanSchema = new Schema<IRideScan>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'RideTicket',
    },
    rideId: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
    },
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
      enum: ['admitted', 'rejected_used', 'rejected_wrong_ride', 'rejected_invalid', 'rejected_unknown', 'rejected_closed'],
    },
    qrPayloadRaw: {
      type: String,
      required: true,
    },
    reason: String,
    gateId: String,
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
RideScanSchema.index({ ticketId: 1, scannedAt: -1 });
RideScanSchema.index({ rideId: 1, scannedAt: -1 });
RideScanSchema.index({ scannedBy: 1, scannedAt: -1 });
RideScanSchema.index({ exhibitionId: 1, scannedAt: -1 });

export const RideScan =
  mongoose.models.RideScan || mongoose.model<IRideScan>('RideScan', RideScanSchema);
