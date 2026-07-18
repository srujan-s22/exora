import mongoose, { Schema, type Document } from 'mongoose';

export interface ISystemSettings extends Document {
  siteTitle: string;
  supportEmail: string;
  defaultTicketValidity: number; // in hours
  ticketPrefix: string;
  maxScansPerTicket: number;
  cancellationWindowSeconds: number;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    siteTitle: {
      type: String,
      required: true,
      trim: true,
      default: 'EXORA',
    },
    supportEmail: {
      type: String,
      required: true,
      trim: true,
      default: 'support@exora.com',
    },
    defaultTicketValidity: {
      type: Number,
      required: true,
      default: 24,
      min: 1,
    },
    ticketPrefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'EXH',
    },
    maxScansPerTicket: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    cancellationWindowSeconds: {
      type: Number,
      required: true,
      default: 30,
      min: 5,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

export const SystemSettings =
  mongoose.models.SystemSettings ||
  mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
