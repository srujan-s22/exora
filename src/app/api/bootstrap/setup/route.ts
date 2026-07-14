import { type NextRequest } from 'next/server';
import { BootstrapService } from '@/lib/services/bootstrap.service';
import { AuditService } from '@/lib/services/audit.service';
import { bootstrapSetupSchema } from '@/lib/validators/bootstrap.schema';
import { createdResponse, errorResponse } from '@/lib/utils/api-response';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/utils/logger';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * POST /api/bootstrap/setup
 * One-time super user creation. Heavily rate-limited.
 */
export const POST = withRateLimit(
  {
    windowMs: 900000, // 15 minutes
    maxRequests: 3,   // Max 3 attempts
  },
  async (req: NextRequest) => {
    try {
      // 1. Check if bootstrap is still available
      const available = await BootstrapService.isBootstrapAllowed();
      if (!available) {
        return errorResponse(
          'BOOTSTRAP_DISABLED',
          'Bootstrap setup is no longer available. A super user already exists.',
          403
        );
      }

      // 2. Parse and validate body
      const body = await req.json();
      const parsed = bootstrapSetupSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return errorResponse(
          'VALIDATION_ERROR',
          firstError?.message || 'Invalid input',
          400,
          { issues: parsed.error.issues }
        );
      }

      // 3. Create the super user
      const superUser = await BootstrapService.createSuperUser(parsed.data);

      // 4. Create audit log (self-referencing since there's no other user yet)
      await AuditService.create({
        action: 'user.bootstrap_created',
        performedBy: superUser.id as any,
        performedByRole: 'super_admin',
        targetType: 'user',
        targetId: superUser.id as any,
        details: {
          staffId: superUser.staffId,
          name: superUser.name,
          method: 'bootstrap_setup',
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });

      return createdResponse({
        user: {
          id: superUser.id,
          staffId: superUser.staffId,
          name: superUser.name,
          role: superUser.role,
        },
        message: 'Super user created successfully. You can now log in.',
      });
    } catch (error: any) {
      logger.error('Error in POST /api/bootstrap/setup:', error);

      // Specific error messages for known issues
      if (error.message?.includes('bootstrap secret') || error.message?.includes('BOOTSTRAP_SECRET')) {
        return errorResponse('INVALID_SECRET', error.message, 403);
      }
      if (error.message?.includes('already in use')) {
        return errorResponse('DUPLICATE', error.message, 409);
      }
      if (error.message?.includes('no longer available')) {
        return errorResponse('BOOTSTRAP_DISABLED', error.message, 403);
      }

      return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to create super user'), 500);
    }
  }
);
