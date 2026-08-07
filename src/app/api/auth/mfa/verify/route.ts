import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { mfaVerifySchema } from '@/lib/validators/auth.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { SUPER_ADMIN_PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS } from '@/lib/config/roles';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { decryptTotpSecret, verifyTotpCode, verifyRecoveryCode } from '@/lib/utils/totp';
import { signJwt } from '@/lib/utils/crypto';
import { AuditService } from '@/lib/services/audit.service';
import type { AuthUser } from '@/types/auth.types';

/**
 * POST /api/auth/mfa/verify
 * Step 2 MFA verification endpoint. Accepts mfaTicket + 6-digit TOTP code or recovery code.
 */
export const POST = withRateLimit(
  {
    keyPrefix: 'mfa-verify',
    windowMs: 5 * 60 * 1000, // 5 minutes window
    maxRequests: 10, // Max 10 verification attempts per 5 minutes
  },
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // 1. Zod input validation
      const parsed = mfaVerifySchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid verification parameters',
          400,
          parsed.error.flatten().fieldErrors
        );
      }

      const { mfaTicket, code, recoveryCode } = parsed.data;
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return errorResponse('SERVER_ERROR', 'Server configuration error', 500);
      }

      // 2. Decode & verify mfaTicket
      let ticketPayload: any;
      try {
        ticketPayload = jwt.verify(mfaTicket, secret);
      } catch (err: any) {
        return errorResponse('UNAUTHORIZED', 'MFA session expired. Please log in again.', 401);
      }

      if (!ticketPayload || ticketPayload.type !== 'mfa_pending' || !ticketPayload.sub) {
        return errorResponse('UNAUTHORIZED', 'Invalid MFA authentication ticket.', 401);
      }

      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
      const userAgent = req.headers.get('user-agent') || undefined;

      await connectToDatabase();

      // 3. Fetch user document with sensitive fields
      const userDoc = await UserModel.findById(ticketPayload.sub).select(
        'staffId name role permissions isActive assignedExhibitions totpEnabled +totpSecretEncrypted +totpRecoveryCodesHashed'
      );

      if (!userDoc || !userDoc.isActive) {
        return errorResponse('UNAUTHORIZED', 'Account not found or deactivated.', 401);
      }

      if (!userDoc.totpEnabled || !userDoc.totpSecretEncrypted) {
        return errorResponse('BAD_REQUEST', 'Multi-factor authentication is not enabled for this account.', 400);
      }

      let isSuccess = false;
      let usedRecoveryCode = false;

      // 4. Verify TOTP Code
      if (code) {
        let plainSecret: string;
        try {
          plainSecret = decryptTotpSecret(userDoc.totpSecretEncrypted);
        } catch {
          logger.error('Failed to decrypt TOTP secret for user:', userDoc.staffId);
          return errorResponse('SERVER_ERROR', 'Internal security configuration error', 500);
        }

        isSuccess = verifyTotpCode(plainSecret, code, 1);

        if (!isSuccess) {
          await AuditService.create({
            action: 'user.mfa_login_failed',
            performedBy: userDoc._id.toString(),
            performedByRole: userDoc.role,
            targetType: 'user',
            targetId: userDoc._id.toString(),
            details: { reason: 'Invalid TOTP code', staffId: userDoc.staffId, severity: 'SECURITY' },
            ipAddress,
            userAgent,
          });
          return errorResponse('UNAUTHORIZED', 'Invalid 6-digit verification code.', 401);
        }
      }
      // 5. Verify Recovery Code
      else if (recoveryCode) {
        const recoveryResult = verifyRecoveryCode(recoveryCode, userDoc.totpRecoveryCodesHashed || []);
        if (!recoveryResult.isValid) {
          await AuditService.create({
            action: 'user.mfa_recovery_failed',
            performedBy: userDoc._id.toString(),
            performedByRole: userDoc.role,
            targetType: 'user',
            targetId: userDoc._id.toString(),
            details: { reason: 'Invalid recovery code', staffId: userDoc.staffId, severity: 'SECURITY' },
            ipAddress,
            userAgent,
          });
          return errorResponse('UNAUTHORIZED', 'Invalid recovery code.', 401);
        }

        isSuccess = true;
        usedRecoveryCode = true;

        // Consume recovery code (remove from array)
        userDoc.totpRecoveryCodesHashed!.splice(recoveryResult.matchedIndex, 1);
      }

      // 6. Update user login status & audit log
      userDoc.lastLoginAt = new Date();
      userDoc.lastTotpLoginAt = new Date();
      if (ipAddress) {
        userDoc.lastLoginIp = ipAddress;
      }
      await userDoc.save();

      await AuditService.create({
        action: usedRecoveryCode ? 'user.mfa_recovery_login_success' : 'user.mfa_login_success',
        performedBy: userDoc._id.toString(),
        performedByRole: userDoc.role,
        targetType: 'user',
        targetId: userDoc._id.toString(),
        details: { staffId: userDoc.staffId, method: usedRecoveryCode ? 'recovery_code' : 'totp' },
        ipAddress,
        userAgent,
      });

      // 7. Resolve permissions & sign final session token
      const permissions = userDoc.role === 'super_admin' ? SUPER_ADMIN_PERMISSIONS : DEFAULT_ADMIN_PERMISSIONS;

      const payload = {
        sub: userDoc._id.toString(),
        staffId: userDoc.staffId,
        role: userDoc.role,
        permissions,
        exhibitions: userDoc.assignedExhibitions.map((id: any) => id.toString()),
      };

      const sessionToken = signJwt(payload, secret, '8h');

      // 8. Set HTTP-only session cookie
      const cookieStore = await cookies();
      cookieStore.set({
        name: AUTH_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 8, // 8 hours
        path: '/',
      });

      const transformedUser: AuthUser = {
        id: userDoc._id.toString(),
        staffId: userDoc.staffId,
        name: userDoc.name,
        role: userDoc.role,
        permissions: permissions as any,
        assignedExhibitions: userDoc.assignedExhibitions.map((id: any) => id.toString()),
        isActive: userDoc.isActive,
      };

      return successResponse({ user: transformedUser });
    } catch (error: any) {
      logger.error('Error in POST /api/auth/mfa/verify:', error);
      return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'MFA verification failed'), 500);
    }
  }
);
