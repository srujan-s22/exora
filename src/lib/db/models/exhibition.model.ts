import mongoose, { Schema, type Document } from 'mongoose';
import { EXHIBITION_STATUSES } from '@/lib/utils/constants';

export interface ITicketType {
  name: string;
  price: number; // in paise
  maxQuantity?: number;
}

export interface IExhibitionSettings {
  allowMultiEntry: boolean;
  maxScansPerTicket: number;
}

export interface IExhibition extends Document {
  name: string;
  slug: string;
  description?: string;
  category: string;
  venue: string;
  address?: string;
  startDate: Date;
  endDate: Date;
  ticketTypes: ITicketType[];
  status: string;
  settings: IExhibitionSettings;
  entryFee: number; // in paise
  capacity: number; // 0 for unlimited
  assignedStaffIds: mongoose.Types.ObjectId[];
  assignedGateIds: string[];
  active: boolean;
  archive: boolean;
  notes?: string;
  images?: string[];
  completedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  managedBy?: mongoose.Types.ObjectId;
  lastStatusChangeAt?: Date;
  lastStatusChangeBy?: mongoose.Types.ObjectId;
  manualPauseReason?: string;
  manualEndReason?: string;
  manualExtendReason?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TicketTypeSchema = new Schema<ITicketType>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    maxQuantity: { type: Number, min: 0 },
  },
  { _id: false }
);

const ExhibitionSettingsSchema = new Schema<IExhibitionSettings>(
  {
    allowMultiEntry: { type: Boolean, default: false },
    maxScansPerTicket: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const ExhibitionSchema = new Schema<IExhibition>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'general',
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    ticketTypes: {
      type: [TicketTypeSchema],
      required: true,
      validate: {
        validator: (v: ITicketType[]) => v.length > 0,
        message: 'At least one ticket type is required',
      },
    },
    status: {
      type: String,
      required: true,
      enum: EXHIBITION_STATUSES,
      default: 'draft',
    },
    settings: {
      type: ExhibitionSettingsSchema,
      default: () => ({ allowMultiEntry: false, maxScansPerTicket: 1 }),
    },
    entryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    assignedStaffIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    assignedGateIds: [{
      type: String,
    }],
    active: {
      type: Boolean,
      default: true,
    },
    archive: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    images: [{
      type: String,
    }],
    completedAt: Date,
    pausedAt: Date,
    resumedAt: Date,
    managedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastStatusChangeAt: Date,
    lastStatusChangeBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    manualPauseReason: {
      type: String,
      trim: true,
    },
    manualEndReason: {
      type: String,
      trim: true,
    },
    manualExtendReason: {
      type: String,
      trim: true,
    },
    createdBy: {
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

// Indexes
ExhibitionSchema.index({ status: 1, startDate: -1 });
ExhibitionSchema.index({ endDate: 1 });

export const Exhibition =
  mongoose.models.Exhibition || mongoose.model<IExhibition>('Exhibition', ExhibitionSchema);
