import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import {
  generateTotpSecret,
  generateOtpauthUri,
  generateQrCodeDataUrl,
  encryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '@/lib/utils/totp';
import { signJwt } from '@/lib/utils/crypto';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';

/**
 * POST /api/auth/mfa/setup
 * Initiate TOTP MFA setup for Super Admin.
 * Returns QR code image, manual secret key, raw recovery codes, and signed setupToken.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    if (req.user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Two-Factor Authentication enrollment is restricted to Super Admins.', 403);
    }

    await connectToDatabase();

    const userDoc = await UserModel.findById(req.user.sub);
    if (!userDoc || !userDoc.isActive) {
      return errorResponse('UNAUTHORIZED', 'User not found or account deactivated.', 401);
    }

    // 1. Generate unencrypted secret & QR code for display
    const plainSecret = generateTotpSecret(20);
    const otpauthUri = generateOtpauthUri(plainSecret, userDoc.staffId);
    const qrCodeUrl = await generateQrCodeDataUrl(otpauthUri);

    // 2. Generate raw recovery codes for display and hash them for storage
    const recoveryCodes = generateRecoveryCodes(8);
    const hashedRecoveryCodes = recoveryCodes.map((code) => hashRecoveryCode(code));

    // 3. Encrypt TOTP secret for server storage
    const encryptedSecret = encryptTotpSecret(plainSecret);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return errorResponse('SERVER_ERROR', 'Server configuration error', 500);
    }

    // 4. Create short-lived signed setup token (10 min expiry)
    const setupToken = signJwt(
      {
        sub: userDoc._id.toString(),
        encryptedSecret,
        hashedRecoveryCodes,
        type: 'mfa_setup',
      },
      jwtSecret,
      '10m'
    );

    return successResponse({
      setupToken,
      secret: plainSecret,
      qrCodeUrl,
      recoveryCodes,
    });
  } catch (error: any) {
    logger.error('Error in POST /api/auth/mfa/setup:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to initiate MFA setup'), 500);
  }
});
