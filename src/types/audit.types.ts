import type { AuditAction, AuditTargetType } from '@/lib/utils/constants';
import type { UserRoleType } from '@/lib/config/roles';

export interface AuditLog {
  id: string;
  action: AuditAction;
  performedBy: string;
  performedByRole: UserRoleType;
  targetType?: AuditTargetType;
  targetId?: string;
  exhibitionId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface CreateAuditLogInput {
  action: AuditAction;
  performedBy: string;
  performedByRole: UserRoleType;
  targetType?: AuditTargetType;
  targetId?: string;
  exhibitionId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
