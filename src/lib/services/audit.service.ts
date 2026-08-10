import { AuditLog as AuditLogModel } from '@/lib/db/models/audit-log.model';
import { connectToDatabase } from '@/lib/db/connection';
import type { AuditLog, CreateAuditLogInput } from '@/types/audit.types';
import type { PaginationParams, PaginationMeta } from '@/types/api.types';
import mongoose from 'mongoose';
import { logger } from '@/lib/utils/logger';
import { applyExhibitionScopeQuery } from '@/lib/utils/exhibition-scope';

/**
 * Audit logging service.
 * Handles creating and querying audit logs.
 */
export const AuditService = {
  async create(data: CreateAuditLogInput): Promise<AuditLog> {
    try {
      await connectToDatabase();
      const log = await AuditLogModel.create({
        ...data,
        timestamp: new Date(),
      });

      // Security Note: Structured event severity classification for centralized log aggregators
      const isSecurityEvent = data.action.includes('failed') || data.action.includes('reset') || data.action.includes('bootstrap') || data.action.includes('cancel');
      if (isSecurityEvent) {
        logger.security(`Audit Event: ${data.action}`, {
          performedBy: data.performedBy,
          role: data.performedByRole,
          targetType: data.targetType,
          targetId: data.targetId,
          ip: data.ipAddress,
        });
      } else {
        logger.info(`Audit Event: ${data.action}`, {
          performedBy: data.performedBy,
          role: data.performedByRole,
          targetType: data.targetType,
        });
      }

      return log.toJSON() as unknown as AuditLog;
    } catch (e) {
      logger.error('Failed to write audit log', e);
      // Fail silently for app flow resilience
      return {
        id: 'failed-audit-log',
        action: data.action,
        performedBy: data.performedBy.toString(),
        performedByRole: data.performedByRole,
        targetType: data.targetType,
        targetId: data.targetId?.toString(),
        exhibitionId: data.exhibitionId?.toString(),
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date(),
      } as unknown as AuditLog;
    }
  },

  async list(params: PaginationParams & {
    action?: string;
    performedBy?: string;
    targetType?: string;
    exhibitionId?: string;
    startDate?: Date;
    endDate?: Date;
  }, user?: any): Promise<{ data: AuditLog[]; pagination: PaginationMeta }> {
    await connectToDatabase();
    
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const skip = (page - 1) * limit;

    let query: any = {};

    if (params.action) query.action = params.action;
    if (params.performedBy) query.performedBy = new mongoose.Types.ObjectId(params.performedBy);
    if (params.targetType) query.targetType = params.targetType;
    if (params.exhibitionId) query.exhibitionId = new mongoose.Types.ObjectId(params.exhibitionId);
    
    if (params.startDate || params.endDate) {
      query.timestamp = {};
      if (params.startDate) query.timestamp.$gte = params.startDate;
      if (params.endDate) query.timestamp.$lte = params.endDate;
    }

    query = applyExhibitionScopeQuery(user, query, 'exhibitionId');

    const total = await AuditLogModel.countDocuments(query);
    const logs = await AuditLogModel.find(query)
      .sort({ timestamp: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'name staffId')
      .populate('exhibitionId', 'name')
      .lean();

    const totalPages = Math.ceil(total / limit);

    return {
      data: logs.map((l: any) => ({
        ...l,
        id: l._id.toString(),
        performedBy: l.performedBy ? { ...l.performedBy, id: l.performedBy._id?.toString() } : undefined,
        exhibitionId: l.exhibitionId ? { ...l.exhibitionId, id: l.exhibitionId._id?.toString() } : undefined,
      }) as unknown as AuditLog),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  async getByEntity(targetType: string, targetId: string): Promise<AuditLog[]> {
    await connectToDatabase();
    const logs = await AuditLogModel.find({
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
    })
      .sort({ timestamp: -1, _id: -1 })
      .populate('performedBy', 'name staffId')
      .lean();
    return logs.map((l: any) => ({
      ...l,
      id: l._id.toString(),
      performedBy: l.performedBy ? { ...l.performedBy, id: l.performedBy._id?.toString() } : undefined,
    }) as unknown as AuditLog);
  },

  async getByUser(userId: string, limit = 50): Promise<AuditLog[]> {
    await connectToDatabase();
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const logs = await AuditLogModel.find({
      performedBy: new mongoose.Types.ObjectId(userId),
    })
      .sort({ timestamp: -1, _id: -1 })
      .limit(safeLimit)
      .populate('exhibitionId', 'name')
      .lean();
    return logs.map((l: any) => ({
      ...l,
      id: l._id.toString(),
      exhibitionId: l.exhibitionId ? { ...l.exhibitionId, id: l.exhibitionId._id?.toString() } : undefined,
    }) as unknown as AuditLog);
  },
};
