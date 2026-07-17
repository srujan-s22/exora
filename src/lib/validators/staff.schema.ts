import { z } from 'zod';

const phoneNumberRegex = /^[6-9]\d{9}$/;

export const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneNumberRegex, 'Must be a valid 10-digit Indian mobile number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'counter', 'gate', 'ride']),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  permissions: z.object({
    canCreateUsers: z.boolean().optional(),
    canResetPasswords: z.boolean().optional(),
    canViewAuditLogs: z.boolean().optional(),
    canManageStaff: z.boolean().optional(),
    canApproveResets: z.boolean().optional(),
    canCreateAdmins: z.boolean().optional(),
    canCreateExhibitions: z.boolean().optional(),
  }).optional(),
  assignedExhibitions: z.array(z.string()).optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  phoneNumber: z
    .string()
    .regex(phoneNumberRegex, 'Must be a valid 10-digit Indian mobile number')
    .optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'counter', 'gate', 'ride']).optional(),
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

export const updatePermissionsSchema = z.object({
  canCreateUsers: z.boolean().optional(),
  canResetPasswords: z.boolean().optional(),
  canViewAuditLogs: z.boolean().optional(),
  canManageStaff: z.boolean().optional(),
  canApproveResets: z.boolean().optional(),
  canCreateAdmins: z.boolean().optional(),
  canCreateExhibitions: z.boolean().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;
