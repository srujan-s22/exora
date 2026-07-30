import mongoose, { Schema, type Document } from 'mongoose';

export interface IPrintConfig {
  paperType: 'thermal_80mm' | 'thermal_58mm' | 'a4' | 'custom';
  layoutMode: 'thermal' | 'a4' | 'custom';
  paperWidth: number;
  paperHeight: number;
  unit: 'mm' | 'px' | 'cm';
  orientation: 'portrait' | 'landscape';
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  ticketPadding: number;
  qrSize: number;
  fontScale: number;
  showLogo: boolean;
  showFooter: boolean;
  compactMode: boolean;
}

export interface ISystemSettings extends Document {
  siteTitle: string;
  supportEmail: string;
  defaultTicketValidity: number; // in hours
  ticketPrefix: string;
  maxScansPerTicket: number;
  cancellationWindowSeconds: number;
  printConfig?: IPrintConfig;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PrintConfigSchema = new Schema<IPrintConfig>(
  {
    paperType: {
      type: String,
      enum: ['thermal_80mm', 'thermal_58mm', 'a4', 'custom'],
      default: 'thermal_80mm',
    },
    layoutMode: {
      type: String,
      enum: ['thermal', 'a4', 'custom'],
      default: 'thermal',
    },
    paperWidth: {
      type: Number,
      default: 80,
    },
    paperHeight: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      enum: ['mm', 'px', 'cm'],
      default: 'mm',
    },
    orientation: {
      type: String,
      enum: ['portrait', 'landscape'],
      default: 'portrait',
    },
    marginTop: {
      type: Number,
      default: 2,
    },
    marginRight: {
      type: Number,
      default: 2,
    },
    marginBottom: {
      type: Number,
      default: 2,
    },
    marginLeft: {
      type: Number,
      default: 2,
    },
    ticketPadding: {
      type: Number,
      default: 4,
    },
    qrSize: {
      type: Number,
      default: 48,
    },
    fontScale: {
      type: Number,
      default: 1.0,
    },
    showLogo: {
      type: Boolean,
      default: true,
    },
    showFooter: {
      type: Boolean,
      default: true,
    },
    compactMode: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

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
      default: 'platform.exora@gmail.com',
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
    printConfig: {
      type: PrintConfigSchema,
      default: () => ({
        paperType: 'thermal_80mm',
        layoutMode: 'thermal',
        paperWidth: 80,
        paperHeight: 0,
        unit: 'mm',
        orientation: 'portrait',
        marginTop: 2,
        marginRight: 2,
        marginBottom: 2,
        marginLeft: 2,
        ticketPadding: 4,
        qrSize: 48,
        fontScale: 1.0,
        showLogo: true,
        showFooter: true,
        compactMode: true,
      }),
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
