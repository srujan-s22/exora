import { z } from 'zod';
import { EXHIBITION_STATUSES } from '@/lib/utils/constants';

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Ticket type name is required').trim(),
  price: z.number().int().min(0, 'Price must be a non-negative integer (in paise)'),
  maxQuantity: z.number().int().min(1).optional(),
});

const exhibitionSettingsSchema = z.object({
  allowMultiEntry: z.boolean().default(false),
  maxScansPerTicket: z.number().int().min(1).default(1),
});

export const createExhibitionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  category: z.string().min(1, 'Category is required').max(100).trim().default('general'),
  venue: z.string().min(1, 'Venue is required').max(200).trim(),
  address: z.string().max(500).trim().optional(),
  startDate: z.string().datetime({ message: 'Invalid start date' }),
  endDate: z.string().datetime({ message: 'Invalid end date' }),
  ticketTypes: z
    .array(ticketTypeSchema)
    .min(1, 'At least one ticket type is required'),
  settings: exhibitionSettingsSchema.optional(),
  entryFee: z.number().int().min(0, 'Entry fee must be non-negative').default(0),
  capacity: z.number().int().min(0, 'Capacity must be non-negative').default(0),
  assignedStaffIds: z.array(z.string()).optional().default([]),
  assignedGateIds: z.array(z.string()).optional().default([]),
  notes: z.string().max(2000).trim().optional(),
  images: z.array(z.string()).optional(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);

export const updateExhibitionSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  category: z.string().min(1).max(100).trim().optional(),
  venue: z.string().min(1).max(200).trim().optional(),
  address: z.string().max(500).trim().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ticketTypes: z.array(ticketTypeSchema).min(1).optional(),
  status: z.enum(EXHIBITION_STATUSES).optional(),
  settings: exhibitionSettingsSchema.partial().optional(),
  entryFee: z.number().int().min(0).optional(),
  capacity: z.number().int().min(0).optional(),
  assignedStaffIds: z.array(z.string()).optional(),
  assignedGateIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  archive: z.boolean().optional(),
  notes: z.string().max(2000).trim().optional(),
  images: z.array(z.string()).optional(),
});

export type CreateExhibitionInput = z.infer<typeof createExhibitionSchema>;
export type UpdateExhibitionInput = z.infer<typeof updateExhibitionSchema>;
