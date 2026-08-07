import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';

/**
 * GET /api/auth/mfa/status
 * Get the current logged-in user's MFA status details.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();

    const userDoc = await UserModel.findById(req.user.sub).select(
      'totpEnabled totpEnabledAt lastTotpLoginAt'
    );

    if (!userDoc) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    return successResponse({
      enabled: !!userDoc.totpEnabled,
      totpEnabledAt: userDoc.totpEnabledAt,
      lastTotpLoginAt: userDoc.lastTotpLoginAt,
    });
  } catch (error: any) {
    logger.error('Error in GET /api/auth/mfa/status:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to fetch MFA status'), 500);
  }
});
