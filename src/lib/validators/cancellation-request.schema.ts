import { z } from 'zod';

export const createCancellationRequestSchema = z.object({
  saleId: z.string().min(1, 'Sale ID is required'),
  saleType: z.enum(['entry', 'ride']).default('entry'),
  cancellationReason: z.string().min(2, 'Cancellation reason is required').trim(),
  note: z.string().trim().optional(),
});

export const listCancellationRequestsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ALL']).default('PENDING'),
  saleType: z.enum(['entry', 'ride', 'all']).default('all'),
  exhibitionId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const rejectCancellationRequestSchema = z.object({
  rejectionReason: z.string().trim().optional(),
});

export type CreateCancellationRequestInput = z.infer<typeof createCancellationRequestSchema>;
export type ListCancellationRequestsInput = z.infer<typeof listCancellationRequestsSchema>;
export type RejectCancellationRequestInput = z.infer<typeof rejectCancellationRequestSchema>;
