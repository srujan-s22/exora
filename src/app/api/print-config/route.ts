import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SystemSettings } from '@/lib/db/models/system-settings.model';
import { AuthService } from '@/lib/services/auth.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';

export const DEFAULT_PRINT_CONFIG = {
  paperType: 'thermal_80mm',
  layoutMode: 'thermal',
  paperWidth: 80,
  paperHeight: 0,
  unit: 'mm',
  orientation: 'portrait',
  marginTop: 2,
  marginRight: 2,
  marginBottom: 2,
  marginLeft: 2,
  ticketPadding: 4,
  qrSize: 48,
  fontScale: 1.0,
  showLogo: true,
  showFooter: true,
  compactMode: true,
};

/**
 * GET /api/print-config
 * Fetch ticket printing layout preferences.
 * Accessible to all authenticated staff (counter, gate, ride, admin, super_admin).
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
    if (!currentUser) {
      return errorResponse('UNAUTHORIZED', 'Invalid session', 401);
    }

    const settings = await SystemSettings.findOne().lean();
    const printConfig = settings?.printConfig || DEFAULT_PRINT_CONFIG;

    return successResponse(printConfig);
  } catch (error: any) {
    logger.error('Error in GET /api/print-config:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to fetch print configuration'), 500);
  }
}
