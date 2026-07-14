import { z } from 'zod';

const phoneNumberRegex = /^[6-9]\d{9}$/;

/**
 * Schema for creating a password reset request.
 * Admin enters the staff member's registered mobile number.
 */
export const createPasswordResetSchema = z.object({
  targetPhoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneNumberRegex, 'Must be a valid 10-digit Indian mobile number'),
});

/**
 * Schema for approving or rejecting a password reset request.
 * Super admin only.
 */
export const passwordResetActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

/**
 * Schema for completing a password reset request.
 * Admin sets the custom password.
 */
export const passwordResetCompleteSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

export type CreatePasswordResetInput = z.infer<typeof createPasswordResetSchema>;
export type PasswordResetActionInput = z.infer<typeof passwordResetActionSchema>;
export type PasswordResetCompleteInput = z.infer<typeof passwordResetCompleteSchema>;
