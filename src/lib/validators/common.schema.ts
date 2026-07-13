import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/utils/constants';

/**
 * Common pagination query params schema.
 * Used across all list endpoints.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * MongoDB ObjectId validation.
 */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

/**
 * Date range filter schema.
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  { message: 'End date must be after or equal to start date' }
);

export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
