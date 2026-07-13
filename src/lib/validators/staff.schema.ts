import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['admin', 'counter', 'gate']),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  assignedExhibitions: z.array(z.string()).optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['admin', 'counter', 'gate']).optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .optional(),
  assignedExhibitions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
