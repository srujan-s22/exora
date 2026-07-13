import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { SaleService } from '@/lib/services/sale.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/sales/stats
 * Get daily sales stats (today's totals and payment splits).
 * Scopes to the active user's sales if role is not admin.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired session', 401);
    }

    if (user.role !== 'admin' && user.role !== 'counter') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    const { searchParams } = new URL(req.url);
    const exhibitionId = searchParams.get('exhibitionId') || undefined;

    // Start/End of today in local system time
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const dateRange = { start: startOfToday, end: endOfToday };

    let stats;
    if (user.role !== 'admin') {
      // Counter staff gets their own daily sales stats (shift stats)
      stats = await SaleService.getStaffSalesStats(user.id, dateRange);
    } else {
      // Admin gets overall stats for today
      stats = await SaleService.getStats(exhibitionId, dateRange);
    }

    return successResponse(stats);
  } catch (error: any) {
    logger.error('Error in GET /api/sales/stats:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to get sales stats', 500);
  }
}
