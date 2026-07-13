import { z } from 'zod';
import { PAYMENT_METHODS } from '@/lib/utils/constants';

export const createTicketSchema = z.object({
  exhibitionId: z.string().min(1, 'Exhibition ID is required'),
  ticketType: z.string().min(1, 'Ticket type is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 tickets per transaction'),
  paymentMethod: z.enum(PAYMENT_METHODS),
  customerName: z.string().max(100).trim().optional(),
  customerPhone: z.string().max(15).trim().optional(),
  upiTransactionRef: z.string().max(100).trim().optional(),
  cashReceived: z.number().min(0).optional(),
  changeGiven: z.number().min(0).optional(),
  notes: z.string().max(500).trim().optional(),
});

export const adminCreateTicketSchema = z.object({
  exhibitionId: z.string().min(1, 'Exhibition ID is required'),
  ticketType: z.string().min(1, 'Ticket type is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Max 100 tickets per transaction'),
  paymentMethod: z.enum(PAYMENT_METHODS).default('free'),
  customerName: z.string().max(100).trim().optional(),
  customerPhone: z.string().max(15).trim().optional(),
  upiTransactionRef: z.string().max(100).trim().optional(),
  notes: z.string().max(500).trim().optional(),
});

export const validateTicketSchema = z.object({
  qrPayload: z.string().min(1, 'QR payload is required'),
  exhibitionId: z.string().min(1, 'Exhibition ID is required'),
  gateId: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AdminCreateTicketInput = z.infer<typeof adminCreateTicketSchema>;
export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
