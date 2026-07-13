import { z } from 'zod';
import { PAYMENT_METHODS } from '@/lib/utils/constants';

export const createRideSchema = z.object({
  name: z.string().min(1, 'Ride name is required').max(100).trim(),
  description: z.string().max(500).trim().optional(),
  price: z.number().int().min(0, 'Price must be non-negative'),
  exhibitionId: z.string().min(1, 'Exhibition ID is required'),
  assignedStaff: z.array(z.string()).optional(),
  status: z.enum(['open', 'closed']).default('open'),
  isActive: z.boolean().default(true),
});

export const updateRideSchema = z.object({
  name: z.string().min(1, 'Ride name is required').max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  price: z.number().int().min(0, 'Price must be non-negative').optional(),
  assignedStaff: z.array(z.string()).optional(),
  status: z.enum(['open', 'closed']).optional(),
  isActive: z.boolean().optional(),
});

export const createRideTicketSchema = z.object({
  exhibitionId: z.string().min(1, 'Exhibition ID is required'),
  rideId: z.string().min(1, 'Ride ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 tickets per transaction'),
  paymentMethod: z.enum(PAYMENT_METHODS),
  customerName: z.string().max(100).trim().optional(),
  customerPhone: z.string().max(15).trim().optional(),
  upiTransactionRef: z.string().max(100).trim().optional(),
  cashReceived: z.number().min(0).optional(),
  changeGiven: z.number().min(0).optional(),
  notes: z.string().max(500).trim().optional(),
});

export const validateRideTicketSchema = z.object({
  qrPayload: z.string().min(1, 'QR payload is required'),
  exhibitionId: z.string().min(1, 'Exhibition ID is required'),
  rideId: z.string().min(1, 'Ride ID is required'),
  gateId: z.string().optional(),
});

export type CreateRideInput = z.infer<typeof createRideSchema>;
export type UpdateRideInput = z.infer<typeof updateRideSchema>;
export type CreateRideTicketInput = z.infer<typeof createRideTicketSchema>;
export type ValidateRideTicketInput = z.infer<typeof validateRideTicketSchema>;
