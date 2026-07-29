import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SystemSettings } from '@/lib/db/models/system-settings.model';
import { AuthService } from '@/lib/services/auth.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { z } from 'zod';
import { AuditService } from '@/lib/services/audit.service';
import { safeErrorMessage } from '@/lib/utils/sanitize';

const printConfigSchema = z.object({
  paperType: z.enum(['thermal_80mm', 'thermal_58mm', 'a4', 'custom']).optional(),
  layoutMode: z.enum(['thermal', 'a4', 'custom']).optional(),
  paperWidth: z.number().min(20).max(500).optional(),
  paperHeight: z.number().min(0).max(1000).optional(),
  unit: z.enum(['mm', 'px', 'cm']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  marginTop: z.number().min(0).max(100).optional(),
  marginRight: z.number().min(0).max(100).optional(),
  marginBottom: z.number().min(0).max(100).optional(),
  marginLeft: z.number().min(0).max(100).optional(),
  ticketPadding: z.number().min(0).max(50).optional(),
  qrSize: z.number().min(20).max(300).optional(),
  fontScale: z.number().min(0.5).max(2.0).optional(),
  showLogo: z.boolean().optional(),
  showFooter: z.boolean().optional(),
  compactMode: z.boolean().optional(),
});

const updateSettingsSchema = z.object({
  siteTitle: z.string().min(1, 'Site title cannot be empty').max(100).trim().optional(),
  supportEmail: z.string().email('Invalid email').trim().optional(),
  defaultTicketValidity: z.number().min(1, 'Validity must be at least 1 hour').max(8760).optional(),
  ticketPrefix: z.string().min(1, 'Prefix cannot be empty').max(10).trim().uppercase().optional(),
  maxScansPerTicket: z.number().min(1, 'Max scans must be at least 1').max(100).optional(),
  cancellationWindowSeconds: z.number().min(5, 'Window must be at least 5 seconds').max(3600).optional(),
  printConfig: printConfigSchema.optional(),
});

/**
 * GET /api/admin/settings
 * Fetch system settings. Super Admin only.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const currentUser = await AuthService.verifyToken(token);
    if (!currentUser || currentUser.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    let settings = await SystemSettings.findOne().populate('updatedBy', 'name staffId');

    if (!settings) {
      // Create defaults
      settings = await SystemSettings.create({
        siteTitle: 'EXORA',
        supportEmail: 'support@exora.com',
        defaultTicketValidity: 24,
        ticketPrefix: 'EXH',
        maxScansPerTicket: 1,
        cancellationWindowSeconds: 30,
        updatedBy: currentUser.id,
      });
      settings = await SystemSettings.findById(settings._id).populate('updatedBy', 'name staffId');
    }

    return successResponse(settings?.toJSON());
  } catch (error: any) {
    logger.error('Error in GET /api/admin/settings:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to fetch settings'), 500);
  }
}

/**
 * PATCH /api/admin/settings
 * Update system settings. Super Admin only.
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const currentUser = await AuthService.verifyToken(token);
    if (!currentUser || currentUser.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    const body = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(
        'VALIDATION_ERROR',
        firstError?.message || 'Invalid input',
        400,
        { issues: parsed.error.issues }
      );
    }

    let settings = await SystemSettings.findOne();
    const isNew = !settings;

    if (!settings) {
      settings = new SystemSettings({
        siteTitle: 'EXORA',
        supportEmail: 'support@exora.com',
        defaultTicketValidity: 24,
        ticketPrefix: 'EXH',
        maxScansPerTicket: 1,
        cancellationWindowSeconds: 30,
        updatedBy: currentUser.id,
      });
    }

    const updates = parsed.data;
    const changes: Record<string, { from: any; to: any }> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'printConfig' && value) {
        const currentPrint = settings.printConfig?.toObject
          ? settings.printConfig.toObject()
          : settings.printConfig || {};
        const newPrintConfig = { ...currentPrint, ...(value as Record<string, any>) };
        settings.printConfig = newPrintConfig as any;
        changes['printConfig'] = { from: currentPrint, to: newPrintConfig };
      } else if (value !== undefined && (settings as any)[key] !== value) {
        const currentVal = (settings as any)[key];
        changes[key] = { from: currentVal, to: value };
        (settings as any)[key] = value;
      }
    });

    if (Object.keys(changes).length > 0 || isNew) {
      settings.updatedBy = currentUser.id as any;
      await settings.save();

      // Audit log
      await AuditService.create({
        action: 'settings.update' as any,
        performedBy: currentUser.id as any,
        performedByRole: currentUser.role,
        targetType: 'settings' as any,
        targetId: settings._id.toString(),
        details: { changes },
      });
    }

    const updatedSettings = await SystemSettings.findOne().populate('updatedBy', 'name staffId');

    return successResponse(updatedSettings?.toJSON());
  } catch (error: any) {
    logger.error('Error in PATCH /api/admin/settings:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to update settings'), 500);
  }
}
