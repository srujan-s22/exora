import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { ExhibitionService } from '@/lib/services/exhibition.service';
import { TicketService } from '@/lib/services/ticket.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/dashboard/gate
 * Fetch data for the gate validation screen:
 * - Active exhibitions assigned to this staff member
 * - Today's gate check-in statistics (admitted, total, flags)
 * - Today's recent scans logs (limit 15)
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

    if (!isAdminOrSuper && user.role !== 'gate') {
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

    // 2. Fetch today's gate check-in statistics
    // Admin sees overall stats; gate staff sees their own shift stats
    const statsUser = !isAdminOrSuper ? user.id : '';
    // Let's modify getGateStats to accept empty statsUser for admin overall stats
    let stats;
    if (!isAdminOrSuper) {
      stats = await TicketService.getGateStats(user.id, dateRange);
    } else {
      // For admin, calculate overall stats by summing all scans today
      const { TicketScan: TicketScanModel } = await import('@/lib/db/models/ticket-scan.model');
      const overallScans = await TicketScanModel.find({ scannedAt: { $gte: startOfToday, $lte: endOfToday } });
      let admittedCount = 0;
      let totalScans = overallScans.length;
      let securityFlags = 0;
      for (const scan of overallScans) {
        if (scan.result === 'admitted') admittedCount += scan.admittedCount || 1;
        else if (scan.result.startsWith('rejected')) securityFlags++;
      }
      stats = { admittedCount, totalScans, securityFlags };
    }

    // 3. Fetch today's recent scans logs (limit to 15)
    const recentScansResult = await TicketService.listScans({
      page: 1,
      limit: 15,
      scannedBy: !isAdminOrSuper ? user.id : undefined,
      startDate: startOfToday,
      endDate: endOfToday,
    });

    return successResponse({
      user,
      activeExhibitions,
      stats,
      recentScans: recentScansResult.data,
    });
  } catch (error: any) {
    logger.error('Error in GET /api/dashboard/gate:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to fetch gate dashboard data', 500);
  }
}
