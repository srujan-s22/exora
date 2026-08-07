import { z } from 'zod';

export const loginSchema = z.object({
  staffId: z
    .string()
    .min(1, 'Staff ID is required')
    .max(50, 'Staff ID exceeds max length of 50 characters')
    .trim()
    .toUpperCase(),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password exceeds max length of 128 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required')
    .max(128, 'Current password exceeds max length of 128 characters'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'New password exceeds max length of 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const mfaVerifySchema = z
  .object({
    mfaTicket: z.string().min(1, 'MFA ticket is required'),
    code: z.string().optional(),
    recoveryCode: z.string().optional(),
  })
  .refine((data) => data.code || data.recoveryCode, {
    message: 'Either TOTP code or recovery code is required',
    path: ['code'],
  });

export const mfaEnableSchema = z.object({
  setupToken: z.string().min(1, 'Setup token is required'),
  code: z.string().length(6, 'TOTP code must be 6 digits'),
});

export const mfaDisableSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
    code: z.string().optional(),
    recoveryCode: z.string().optional(),
  })
  .refine((data) => data.code || data.recoveryCode, {
    message: 'Either TOTP code or recovery code is required',
    path: ['code'],
  });

export const mfaRegenerateSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  code: z.string().length(6, 'TOTP code must be 6 digits'),
});

