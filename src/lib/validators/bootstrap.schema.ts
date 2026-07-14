import { z } from 'zod';

const phoneNumberRegex = /^[6-9]\d{9}$/;

/**
 * Schema for the one-time super user bootstrap setup.
 */
export const bootstrapSetupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  staffId: z
    .string()
    .min(1, 'Staff ID is required')
    .max(20)
    .trim()
    .toUpperCase(),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneNumberRegex, 'Must be a valid 10-digit Indian mobile number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  bootstrapSecret: z
    .string()
    .min(1, 'Bootstrap secret is required'),
});

export type BootstrapSetupInput = z.infer<typeof bootstrapSetupSchema>;
