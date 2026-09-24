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

export const exhibitionLocationSchema = z.object({
  venueName: z.string().min(1, 'Venue name is required').max(200, 'Venue name cannot exceed 200 characters').trim(),
  address: z.string().min(1, 'Address is required').max(500, 'Address cannot exceed 500 characters').trim(),
  city: z.string().min(1, 'City is required').max(100, 'City cannot exceed 100 characters').trim(),
  state: z.string().min(1, 'State is required').max(100, 'State cannot exceed 100 characters').trim(),
  country: z.string().min(1, 'Country is required').max(100, 'Country cannot exceed 100 characters').trim(),
  postalCode: z.string().max(50, 'Postal code cannot exceed 50 characters').trim().optional().default(''),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').nullable().optional(),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').nullable().optional(),
  placeId: z.string().max(250).trim().optional(),
});

export const createExhibitionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  category: z.string().min(1, 'Category is required').max(100).trim().default('general'),
  venue: z.string().max(200).trim().optional(),
  address: z.string().max(500).trim().optional(),
  location: exhibitionLocationSchema,
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
  location: exhibitionLocationSchema.nullable().optional(),
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
export type ExhibitionLocationInput = z.infer<typeof exhibitionLocationSchema>;
