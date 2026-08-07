import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { mfaDisableSchema } from '@/lib/validators/auth.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { decryptTotpSecret, verifyTotpCode, verifyRecoveryCode } from '@/lib/utils/totp';
import { comparePassword } from '@/lib/utils/crypto';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { AuditService } from '@/lib/services/audit.service';

/**
 * POST /api/auth/mfa/disable
 * Disable MFA for Super Admin. Requires password confirmation and valid TOTP/recovery code.
 */
export const POST = withRateLimit(
  {
    keyPrefix: 'mfa-disable',
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },
  withAuth(async (req: AuthenticatedRequest) => {
      try {
        if (req.user.role !== 'super_admin') {
          return errorResponse('FORBIDDEN', 'MFA management is restricted to Super Admins.', 403);
        }

        const body = await req.json();
        const parsed = mfaDisableSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse('VALIDATION_ERROR', 'Invalid parameters', 400, parsed.error.flatten().fieldErrors);
        }

        const { password, code, recoveryCode } = parsed.data;

        await connectToDatabase();

        const userDoc = await UserModel.findById(req.user.sub).select(
          'staffId role isActive totpEnabled +passwordHash +totpSecretEncrypted +totpRecoveryCodesHashed'
        );

        if (!userDoc || !userDoc.isActive) {
          return errorResponse('UNAUTHORIZED', 'Account not found or deactivated.', 401);
        }

        if (!userDoc.totpEnabled) {
          return errorResponse('BAD_REQUEST', 'Multi-factor authentication is not currently enabled.', 400);
        }

        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
        const userAgent = req.headers.get('user-agent') || undefined;

        // 1. Verify user password
        const isPasswordValid = await comparePassword(password, userDoc.passwordHash);
        if (!isPasswordValid) {
          await AuditService.create({
            action: 'user.mfa_disable_failed',
            performedBy: req.user.sub,
            performedByRole: req.user.role,
            targetType: 'user',
            targetId: req.user.sub,
            details: { reason: 'Incorrect password during MFA disable request', staffId: req.user.staffId },
            ipAddress,
            userAgent,
          });
          return errorResponse('FORBIDDEN', 'Incorrect password.', 403);
        }

        // 2. Verify TOTP or Recovery Code
        let isCodeValid = false;
        if (code && userDoc.totpSecretEncrypted) {
          const plainSecret = decryptTotpSecret(userDoc.totpSecretEncrypted);
          isCodeValid = verifyTotpCode(plainSecret, code, 1);
        } else if (recoveryCode && userDoc.totpRecoveryCodesHashed) {
          const recoveryResult = verifyRecoveryCode(recoveryCode, userDoc.totpRecoveryCodesHashed);
          isCodeValid = recoveryResult.isValid;
        }

        if (!isCodeValid) {
          await AuditService.create({
            action: 'user.mfa_disable_failed',
            performedBy: req.user.sub,
            performedByRole: req.user.role,
            targetType: 'user',
            targetId: req.user.sub,
            details: { reason: 'Invalid TOTP/recovery code during MFA disable request', staffId: req.user.staffId },
            ipAddress,
            userAgent,
          });
          return errorResponse('BAD_REQUEST', 'Invalid 6-digit code or recovery code.', 400);
        }

        // 3. Clear MFA fields
        userDoc.totpEnabled = false;
        userDoc.totpSecretEncrypted = undefined;
        userDoc.totpRecoveryCodesHashed = [];
        userDoc.totpDisabledAt = new Date();

        await userDoc.save();

        await AuditService.create({
          action: 'user.mfa_disabled',
          performedBy: req.user.sub,
          performedByRole: req.user.role,
          targetType: 'user',
          targetId: req.user.sub,
          details: { staffId: req.user.staffId },
          ipAddress,
          userAgent,
        });

        return successResponse({
          message: 'Two-factor authentication has been disabled on your account.',
        });
      } catch (error: any) {
        logger.error('Error in POST /api/auth/mfa/disable:', error);
        return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to disable MFA'), 500);
      }
    }
  )
);
