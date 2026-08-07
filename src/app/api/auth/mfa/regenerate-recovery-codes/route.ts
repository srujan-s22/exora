import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { mfaRegenerateSchema } from '@/lib/validators/auth.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { decryptTotpSecret, verifyTotpCode, generateRecoveryCodes, hashRecoveryCode } from '@/lib/utils/totp';
import { comparePassword } from '@/lib/utils/crypto';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { AuditService } from '@/lib/services/audit.service';

/**
 * POST /api/auth/mfa/regenerate-recovery-codes
 * Generate new recovery codes for Super Admin. Invalidates all previous recovery codes.
 */
export const POST = withRateLimit(
  {
    keyPrefix: 'mfa-regen-codes',
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },
  withAuth(async (req: AuthenticatedRequest) => {
      try {
        if (req.user.role !== 'super_admin') {
          return errorResponse('FORBIDDEN', 'MFA management is restricted to Super Admins.', 403);
        }

        const body = await req.json();
        const parsed = mfaRegenerateSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse('VALIDATION_ERROR', 'Invalid parameters', 400, parsed.error.flatten().fieldErrors);
        }

        const { password, code } = parsed.data;

        await connectToDatabase();

        const userDoc = await UserModel.findById(req.user.sub).select(
          'staffId role isActive totpEnabled +passwordHash +totpSecretEncrypted'
        );

        if (!userDoc || !userDoc.isActive) {
          return errorResponse('UNAUTHORIZED', 'Account not found or deactivated.', 401);
        }

        if (!userDoc.totpEnabled || !userDoc.totpSecretEncrypted) {
          return errorResponse('BAD_REQUEST', 'Multi-factor authentication is not enabled.', 400);
        }

        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
        const userAgent = req.headers.get('user-agent') || undefined;

        // 1. Verify password
        const isPasswordValid = await comparePassword(password, userDoc.passwordHash);
        if (!isPasswordValid) {
          return errorResponse('FORBIDDEN', 'Incorrect password.', 403);
        }

        // 2. Verify TOTP code
        const plainSecret = decryptTotpSecret(userDoc.totpSecretEncrypted);
        const isCodeValid = verifyTotpCode(plainSecret, code, 1);
        if (!isCodeValid) {
          return errorResponse('BAD_REQUEST', 'Invalid 6-digit verification code.', 400);
        }

        // 3. Generate new recovery codes
        const newRecoveryCodes = generateRecoveryCodes(8);
        const hashedCodes = newRecoveryCodes.map((c) => hashRecoveryCode(c));

        userDoc.totpRecoveryCodesHashed = hashedCodes;
        await userDoc.save();

        await AuditService.create({
          action: 'user.mfa_recovery_codes_regenerated',
          performedBy: req.user.sub,
          performedByRole: req.user.role,
          targetType: 'user',
          targetId: req.user.sub,
          details: { staffId: req.user.staffId },
          ipAddress,
          userAgent,
        });

        return successResponse({
          recoveryCodes: newRecoveryCodes,
          message: 'New recovery codes generated. Previous recovery codes are now invalid.',
        });
      } catch (error: any) {
        logger.error('Error in POST /api/auth/mfa/regenerate-recovery-codes:', error);
        return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to regenerate recovery codes'), 500);
      }
    }
  )
);
