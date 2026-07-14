import { BootstrapService } from '@/lib/services/bootstrap.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import { safeErrorMessage } from '@/lib/utils/sanitize';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bootstrap/status
 * Public route — checks if bootstrap setup is available.
 */
export async function GET() {
  try {
    const available = await BootstrapService.isBootstrapAllowed();
    const superUserExists = await BootstrapService.isSuperUserExists();
    return new Response(JSON.stringify({ success: true, data: { available, superUserExists } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    logger.error('Error in GET /api/bootstrap/status:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to check bootstrap status'), 500);
  }
}
