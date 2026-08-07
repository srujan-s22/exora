import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { mfaEnableSchema } from '@/lib/validators/auth.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { decryptTotpSecret, verifyTotpCode } from '@/lib/utils/totp';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { AuditService } from '@/lib/services/audit.service';

/**
 * POST /api/auth/mfa/enable
 * Verify TOTP code and finalize enabling MFA for Super Admin.
 */
export const POST = withRateLimit(
  {
    keyPrefix: 'mfa-enable',
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },
  withAuth(async (req: AuthenticatedRequest) => {
      try {
        if (req.user.role !== 'super_admin') {
          return errorResponse('FORBIDDEN', 'MFA activation is restricted to Super Admins.', 403);
        }

        const body = await req.json();
        const parsed = mfaEnableSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse('VALIDATION_ERROR', 'Invalid parameters', 400, parsed.error.flatten().fieldErrors);
        }

        const { setupToken, code } = parsed.data;
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return errorResponse('SERVER_ERROR', 'Server configuration error', 500);
        }

        let payload: any;
        try {
          payload = jwt.verify(setupToken, secret);
        } catch {
          return errorResponse('UNAUTHORIZED', 'Setup session expired. Please start MFA setup again.', 401);
        }

        if (!payload || payload.type !== 'mfa_setup' || payload.sub !== req.user.sub) {
          return errorResponse('UNAUTHORIZED', 'Invalid setup token.', 401);
        }

        const plainSecret = decryptTotpSecret(payload.encryptedSecret);
        const isValid = verifyTotpCode(plainSecret, code, 1);

        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
        const userAgent = req.headers.get('user-agent') || undefined;

        if (!isValid) {
          await AuditService.create({
            action: 'user.mfa_enable_failed',
            performedBy: req.user.sub,
            performedByRole: req.user.role,
            targetType: 'user',
            targetId: req.user.sub,
            details: { reason: 'Incorrect TOTP verification code during setup', staffId: req.user.staffId },
            ipAddress,
            userAgent,
          });

          return errorResponse(
            'BAD_REQUEST',
            'Invalid verification code. Please check your authenticator app and try again.',
            400
          );
        }

        await connectToDatabase();

        const userDoc = await UserModel.findById(req.user.sub);
        if (!userDoc || !userDoc.isActive) {
          return errorResponse('UNAUTHORIZED', 'User account not found or deactivated.', 401);
        }

        const now = new Date();
        userDoc.totpEnabled = true;
        userDoc.totpSecretEncrypted = payload.encryptedSecret;
        userDoc.totpRecoveryCodesHashed = payload.hashedRecoveryCodes;
        userDoc.totpEnabledAt = now;
        userDoc.totpVerifiedAt = now;

        await userDoc.save();

        await AuditService.create({
          action: 'user.mfa_enabled',
          performedBy: req.user.sub,
          performedByRole: req.user.role,
          targetType: 'user',
          targetId: req.user.sub,
          details: { staffId: req.user.staffId },
          ipAddress,
          userAgent,
        });

        return successResponse({
          message: 'Two-factor authentication has been successfully enabled on your account.',
        });
      } catch (error: any) {
        logger.error('Error in POST /api/auth/mfa/enable:', error);
        return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to enable MFA'), 500);
      }
    }
  )
);
