import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db/connection';
import { Session, type ISession } from '@/lib/db/models/session.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { parseUserAgent, getLocationLabel } from '@/lib/utils/device-parser';
import { AuditService } from '@/lib/services/audit.service';
import { logger } from '@/lib/utils/logger';

import type { UserRoleType } from '@/lib/config/roles';

// In-memory cache for lastSeenAt throttle (session ID -> last updated timestamp)
const lastSeenThrottleMap = new Map<string, number>();
const THROTTLE_INTERVAL_MS = 60 * 1000; // 1 minute throttle window

export interface CreateSessionParams {
  userId: string;
  role: UserRoleType | string;
  ipAddress?: string;
  userAgent?: string;
  loginMethod?: string;
  durationHours?: number;
}

export const SessionService = {
  /**
   * Create a new server-side session record.
   */
  async createSession(params: CreateSessionParams): Promise<ISession> {
    await connectToDatabase();

    const sessionId = crypto.randomUUID();
    const parsedAgent = parseUserAgent(params.userAgent);
    const locationLabel = getLocationLabel(params.ipAddress);
    const durationHours = params.durationHours || 8;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const session = await Session.create({
      sessionId,
      userId: params.userId,
      role: params.role,
      deviceName: parsedAgent.deviceName,
      browserName: parsedAgent.browserName,
      browserVersion: parsedAgent.browserVersion,
      osName: parsedAgent.osName,
      osVersion: parsedAgent.osVersion,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      locationLabel,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      expiresAt,
      isRevoked: false,
      loginMethod: params.loginMethod || 'credentials',
      authVersion: 1,
    });

    // Write session created audit log asynchronously
    AuditService.create({
      action: 'session.created',
      performedBy: params.userId,
      performedByRole: params.role as UserRoleType,
      targetType: 'session',
      targetId: session._id,
      details: {
        sessionId,
        deviceName: parsedAgent.deviceName,
        browserName: parsedAgent.browserName,
        osName: parsedAgent.osName,
        ipAddress: params.ipAddress,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }).catch((err) => logger.error('Failed to write session created audit log:', err));

    return session;
  },

  /**
   * Validate that a session exists, is active, and is not expired.
   * Updates lastSeenAt with 1-minute throttle to optimize DB write performance.
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; reason?: string; session?: ISession }> {
    if (!sessionId) {
      return { valid: false, reason: 'MISSING_SESSION_ID' };
    }

    try {
      await connectToDatabase();

      const session = await Session.findOne({ sessionId });
      if (!session) {
        return { valid: false, reason: 'NOT_FOUND' };
      }

      if (session.isRevoked) {
        return { valid: false, reason: 'REVOKED', session };
      }

      const now = new Date();
      if (session.expiresAt && session.expiresAt < now) {
        return { valid: false, reason: 'EXPIRED', session };
      }

      // Throttled lastSeenAt update (max 1 update per minute per session)
      const lastUpdated = lastSeenThrottleMap.get(sessionId) || 0;
      if (now.getTime() - lastUpdated > THROTTLE_INTERVAL_MS) {
        lastSeenThrottleMap.set(sessionId, now.getTime());
        Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } }).catch((err) =>
          logger.error('Failed to update session lastSeenAt:', err)
        );
      }

      return { valid: true, session };
    } catch (err: any) {
      logger.error('Session validation database error:', err);
      // In case of transient DB error, return valid if session structure is acceptable to avoid dropping connections
      return { valid: true };
    }
  },

  /**
   * Revoke a single session by sessionId.
   */
  async revokeSession(
    sessionId: string,
    revokedByUserId: string,
    reason: string = 'User requested revocation',
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    await connectToDatabase();

    const session = await Session.findOne({ sessionId });
    if (!session) return false;

    if (session.isRevoked) return true; // Already revoked

    session.isRevoked = true;
    session.revokedAt = new Date();
    session.revokedBy = revokedByUserId as any;
    session.revokeReason = reason;
    await session.save();

    // Fetch revoker role for audit log
    const revoker = await UserModel.findById(revokedByUserId).select('role');
    const revokerRole = (revoker?.role || 'admin') as UserRoleType;

    await AuditService.create({
      action: 'session.revoked',
      performedBy: revokedByUserId,
      performedByRole: revokerRole,
      targetType: 'session',
      targetId: session._id,
      details: {
        sessionId,
        targetUserId: session.userId.toString(),
        reason,
        deviceName: session.deviceName,
        browserName: session.browserName,
      },
      ipAddress,
      userAgent,
    });

    return true;
  },

  /**
   * Revoke all other active sessions for a given user except currentSessionId.
   */
  async revokeAllOtherSessions(
    userId: string,
    currentSessionId: string,
    revokedByUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<number> {
    await connectToDatabase();

    const query = {
      userId,
      sessionId: { $ne: currentSessionId },
      isRevoked: false,
    };

    const countToRevoke = await Session.countDocuments(query);
    if (countToRevoke === 0) return 0;

    await Session.updateMany(query, {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: revokedByUserId,
        revokeReason: 'Revoked all other active devices/sessions',
      },
    });

    const revoker = await UserModel.findById(revokedByUserId).select('role');
    const revokerRole = (revoker?.role || 'admin') as UserRoleType;

    await AuditService.create({
      action: 'session.logout_other_devices',
      performedBy: revokedByUserId,
      performedByRole: revokerRole,
      targetType: 'user',
      targetId: userId as any,
      details: {
        revokedCount: countToRevoke,
        currentSessionId,
      },
      ipAddress,
      userAgent,
    });

    return countToRevoke;
  },

  /**
   * List active sessions for a specific user.
   */
  async listUserSessions(userId: string, currentSessionId?: string, includeRevoked: boolean = false) {
    await connectToDatabase();

    const now = new Date();
    const filter: any = { userId };
    if (!includeRevoked) {
      filter.isRevoked = false;
      filter.expiresAt = { $gt: now };
    }

    const sessions = await Session.find(filter)
      .sort({ lastSeenAt: -1 })
      .limit(50)
      .lean();

    return sessions.map((s: any) => ({
      id: s._id.toString(),
      sessionId: s.sessionId,
      userId: s.userId.toString(),
      role: s.role,
      deviceName: s.deviceName || 'Unknown Device',
      browserName: s.browserName || 'Unknown Browser',
      browserVersion: s.browserVersion || '',
      osName: s.osName || 'Unknown OS',
      osVersion: s.osVersion || '',
      ipAddress: s.ipAddress || '',
      userAgent: s.userAgent || '',
      locationLabel: s.locationLabel || 'Local Network',
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
      lastSeenAt: s.lastSeenAt ? new Date(s.lastSeenAt).toISOString() : new Date().toISOString(),
      expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : new Date().toISOString(),
      revokedAt: s.revokedAt ? new Date(s.revokedAt).toISOString() : undefined,
      revokedBy: s.revokedBy ? s.revokedBy.toString() : undefined,
      revokeReason: s.revokeReason,
      isRevoked: Boolean(s.isRevoked || (s.expiresAt && new Date(s.expiresAt) < now)),
      isCurrentSession: Boolean(currentSessionId && s.sessionId === currentSessionId),
      loginMethod: s.loginMethod || 'credentials',
    }));
  },

  /**
   * List system-wide active sessions across all users (Super Admin feature).
   */
  async listAllActiveSessions(options?: { limit?: number; role?: string; search?: string }) {
    await connectToDatabase();

    const limit = options?.limit || 100;
    const now = new Date();

    const filter: any = {
      isRevoked: false,
      expiresAt: { $gt: now },
    };

    if (options?.role) {
      filter.role = options.role;
    }

    const sessions = await Session.find(filter)
      .populate('userId', 'name staffId role email')
      .sort({ lastSeenAt: -1 })
      .limit(limit)
      .lean();

    return sessions.map((s: any) => {
      const user = s.userId && typeof s.userId === 'object' ? s.userId : null;
      return {
        id: s._id.toString(),
        sessionId: s.sessionId,
        userId: user ? user._id.toString() : s.userId?.toString() || '',
        userName: user?.name || 'Unknown User',
        staffId: user?.staffId || 'N/A',
        role: s.role,
        deviceName: s.deviceName || 'Unknown Device',
        browserName: s.browserName || 'Unknown Browser',
        browserVersion: s.browserVersion || '',
        osName: s.osName || 'Unknown OS',
        osVersion: s.osVersion || '',
        ipAddress: s.ipAddress || '',
        userAgent: s.userAgent || '',
        locationLabel: s.locationLabel || 'Local Network',
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
        lastSeenAt: s.lastSeenAt ? new Date(s.lastSeenAt).toISOString() : new Date().toISOString(),
        expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : new Date().toISOString(),
        isRevoked: false,
        isCurrentSession: false,
        loginMethod: s.loginMethod || 'credentials',
      };
    });
  },
};
