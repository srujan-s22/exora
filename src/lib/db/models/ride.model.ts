import mongoose, { Schema, type Document } from 'mongoose';

export interface IRide extends Document {
  name: string;
  description?: string;
  price: number; // in paise
  exhibitionId: mongoose.Types.ObjectId;
  assignedStaff: mongoose.Types.ObjectId[];
  status: 'open' | 'closed';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RideSchema = new Schema<IRide>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    exhibitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Exhibition',
      required: true,
    },
    assignedStaff: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    status: {
      type: String,
      required: true,
      enum: ['open', 'closed'],
      default: 'open',
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
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
RideSchema.index({ exhibitionId: 1, isActive: 1 });
RideSchema.index({ assignedStaff: 1 });

export const Ride = mongoose.models.Ride || mongoose.model<IRide>('Ride', RideSchema);
