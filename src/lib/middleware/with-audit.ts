import { headers } from 'next/headers';
import type { AuditAction, AuditTargetType } from '@/lib/utils/constants';
import type { AuthenticatedRequest } from './with-auth';
import { AuditService } from '@/lib/services/audit.service';
import { logger } from '@/lib/utils/logger';
import type { NextRequest } from 'next/server';

interface AuditContext {
  action: AuditAction;
  targetType?: AuditTargetType;
  getTargetId?: (req: NextRequest) => string | undefined;
  getExhibitionId?: (req: NextRequest) => string | undefined;
  getDetails?: (req: NextRequest, response: Response) => Record<string, unknown> | undefined;
}

/**
 * API middleware that creates an audit log entry after a successful response.
 * Must be used AFTER withAuth.
 */
export function withAudit(
  auditContext: AuditContext,
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<Response>
) {
  return async (req: AuthenticatedRequest, context?: unknown): Promise<Response> => {
    const response = await handler(req, context);

    // Only log successful mutations (2xx responses)
    if (response.ok && req.user) {
      try {
        const headersList = await headers();
        const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        await AuditService.create({
          action: auditContext.action,
          performedBy: req.user.sub,
          performedByRole: req.user.role,
          targetType: auditContext.targetType,
          targetId: auditContext.getTargetId?.(req),
          exhibitionId: auditContext.getExhibitionId?.(req),
          details: auditContext.getDetails?.(req, response),
          ipAddress,
          userAgent,
        });
      } catch (error) {
        // Audit logging should never break the main response
        logger.error('Failed to create audit log', error, { action: auditContext.action });
      }
    }

    return response;
  };
}
