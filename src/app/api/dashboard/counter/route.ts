import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { ExhibitionService } from '@/lib/services/exhibition.service';
import { SaleService } from '@/lib/services/sale.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/dashboard/counter
 * Fetch critical data for the counter ticketing console:
 * - List of active exhibitions assigned to this staff member
 * - Today's sales performance metrics (total tickets, revenue splits)
 * - Today's recent transactions feed (up to 10 logs)
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

    const isAdminOrSuper = user.role === 'admin' || user.role === 'super_admin';

    if (!isAdminOrSuper && user.role !== 'counter') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // 1. Get active assigned exhibitions
    const activeExhibitions = await ExhibitionService.getActiveExhibitionsForStaff(user.id, user.role);

    // Date range of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const dateRange = { start: startOfToday, end: endOfToday };

    // 2. Fetch today's shift statistics
    let stats;
    if (!isAdminOrSuper) {
      stats = await SaleService.getStaffSalesStats(user.id, dateRange);
    } else {
      stats = await SaleService.getStats(undefined, dateRange);
    }

    // 3. Fetch today's recent sales list (limit to 10)
    const recentSalesResult = await SaleService.list({
      page: 1,
      limit: 10,
      soldBy: !isAdminOrSuper ? user.id : undefined,
      startDate: startOfToday,
      endDate: endOfToday,
    }, user);

    return successResponse({
      user,
      activeExhibitions,
      stats,
      recentSales: recentSalesResult.data,
    });
  } catch (error: any) {
    logger.error('Error in GET /api/dashboard/counter:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to fetch counter dashboard data', 500);
  }
}
