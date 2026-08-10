import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connection';
import { CancellationRequest, type ICancellationRequest } from '@/lib/db/models/cancellation-request.model';
import { Sale } from '@/lib/db/models/sale.model';
import { RideSale } from '@/lib/db/models/ride-sale.model';
import { Ticket } from '@/lib/db/models/ticket.model';
import { RideTicket } from '@/lib/db/models/ride-ticket.model';
import { User } from '@/lib/db/models/user.model';
import { SystemSettings } from '@/lib/db/models/system-settings.model';
import { AuditService } from '@/lib/services/audit.service';
import { NotificationService } from '@/lib/services/notification.service';
import { hasExhibitionAccess, applyExhibitionScopeQuery, requireExhibitionAccess } from '@/lib/utils/exhibition-scope';
import type { AuthUser } from '@/types/auth.types';

export interface CreateCancellationRequestData {
  saleId: string;
  saleType: 'entry' | 'ride';
  cancellationReason: string;
  note?: string;
}

export interface ListCancellationRequestsQuery {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'ALL';
  saleType?: 'entry' | 'ride' | 'all';
  exhibitionId?: string;
  page?: number;
  limit?: number;
}

export class CancellationRequestService {
  /**
   * Submit a new cancellation request (Counter Staff or Admin).
   * Enforces 30-second window for counter staff.
   */
  static async createRequest(
    data: CreateCancellationRequestData,
    user: AuthUser,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<ICancellationRequest> {
    await connectToDatabase();

    const saleObjectId = new mongoose.Types.ObjectId(data.saleId);
    let saleDoc: any = null;
    let ticketModel: any = null;
    let isRide = data.saleType === 'ride';

    if (isRide) {
      saleDoc = await RideSale.findById(saleObjectId);
      ticketModel = RideTicket;
    } else {
      saleDoc = await Sale.findById(saleObjectId);
      ticketModel = Ticket;
    }

    if (!saleDoc) {
      throw new Error('Transaction not found');
    }

    if (saleDoc.status === 'cancelled') {
      throw new Error('Transaction is already cancelled');
    }

    if (saleDoc.cancellationStatus === 'pending') {
      throw new Error('A cancellation request is already pending for this transaction');
    }

    // Check if an existing PENDING request exists in DB
    const existingPending = await CancellationRequest.findOne({
      saleId: saleObjectId,
      status: 'PENDING',
    });
    if (existingPending) {
      throw new Error('A cancellation request is already pending for this transaction');
    }

    // Fetch system cancellation window
    const settings = await SystemSettings.findOne();
    const windowSeconds = settings?.cancellationWindowSeconds || 30;

    const elapsedMs = Date.now() - new Date(saleDoc.soldAt).getTime();

    // Enforce 30s creation limit for counter staff
    if (user.role === 'counter' && elapsedMs > windowSeconds * 1000) {
      throw new Error(`Cancellation window has expired (${windowSeconds} seconds limit).`);
    }

    // Check if tickets have been used/redeemed
    const linkedTickets = await ticketModel.find({ _id: { $in: saleDoc.tickets } });
    const usedTicket = linkedTickets.find((t: any) => t.usedCount > 0 || t.status === 'used' || t.status === 'partially_used');
    if (usedTicket) {
      throw new Error('Cannot request cancellation for tickets that have already been scanned or used');
    }

    const requestId = `CLR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Create Cancellation Request document
    const request = new CancellationRequest({
      requestId,
      saleId: saleDoc._id,
      saleType: isRide ? 'ride' : 'entry',
      exhibitionId: saleDoc.exhibitionId,
      createdBy: new mongoose.Types.ObjectId(user.id),
      status: 'PENDING',
      cancellationReason: data.cancellationReason.trim(),
      note: data.note?.trim(),
      requestedAt: new Date(),
      originalSaleAmount: saleDoc.totalAmount,
      ticketCount: saleDoc.ticketCount,
      requestWindowSeconds: windowSeconds,
    });

    await request.save();

    // Update Sale status flags
    saleDoc.cancellationStatus = 'pending';
    saleDoc.pendingCancellationRequestId = request._id;
    await saleDoc.save();

    // Update linked Tickets status flags
    await ticketModel.updateMany(
      { _id: { $in: saleDoc.tickets } },
      { $set: { cancellationStatus: 'pending' } }
    );

    // Write Audit log
    await AuditService.create({
      action: 'cancellation_request.create' as any,
      performedBy: user.id as any,
      performedByRole: user.role,
      targetType: 'cancellation_request' as any,
      targetId: request._id.toString(),
      details: {
        requestId,
        transactionId: saleDoc.transactionId,
        saleType: data.saleType,
        totalAmount: saleDoc.totalAmount,
        ticketCount: saleDoc.ticketCount,
        reason: data.cancellationReason,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    // Notify eligible Admin users assigned to this exhibition with cancellation approval permission on
    try {
      const targetExhibitionId = saleDoc.exhibitionId ? saleDoc.exhibitionId.toString() : null;

      const candidateAdmins = await User.find({
        role: { $in: ['super_admin', 'admin'] },
        isActive: true,
      }).select('_id role permissions exhibitionAccessMode assignedExhibitions');

      const eligibleAdmins = candidateAdmins.filter((adminDoc) => {
        // 1. Must be assigned to the exhibition from which cancellation request is sent
        if (targetExhibitionId && !hasExhibitionAccess(adminDoc, targetExhibitionId)) {
          return false;
        }

        // 2. Super admins always have approval authority
        if (adminDoc.role === 'super_admin') {
          return true;
        }

        // 3. Admin must have cancellation approval permission set to on
        const perms = adminDoc.permissions;
        if (!perms) return false;

        if (perms.canApproveTicketCancellation) return true;
        if (isRide && perms.canApproveRideTicketCancellation) return true;
        if (!isRide && perms.canApproveEntryTicketCancellation) return true;

        return false;
      });

      if (eligibleAdmins.length > 0) {
        const adminUserIds = eligibleAdmins.map((a) => a._id.toString());
        await NotificationService.sendBroadcastNotifications({
          senderId: user.id,
          targetType: 'users',
          recipientUserIds: adminUserIds,
          title: 'New Ticket Cancellation Request',
          message: `Counter staff requested cancellation for ${saleDoc.transactionId} (₹${saleDoc.totalAmount / 100}).`,
          type: 'alert',
        });
      }
    } catch (notifErr) {
      // Non-blocking notification error handling
      console.error('Failed to dispatch cancellation request notification:', notifErr);
    }

    return request;
  }

  /**
   * List cancellation requests for Admin queue.
   */
  static async listRequests(query: ListCancellationRequestsQuery, user?: AuthUser) {
    await connectToDatabase();

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    let filter: Record<string, any> = {};

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }

    if (query.saleType && query.saleType !== 'all') {
      filter.saleType = query.saleType;
    }

    if (query.exhibitionId) {
      filter.exhibitionId = new mongoose.Types.ObjectId(query.exhibitionId);
    }

    if (user) {
      filter = applyExhibitionScopeQuery(user, filter, 'exhibitionId');
    }

    const [docs, total] = await Promise.all([
      CancellationRequest.find(filter)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name staffId role')
        .populate('reviewedBy', 'name staffId role')
        .populate('exhibitionId', 'name')
        .lean(),
      CancellationRequest.countDocuments(filter),
    ]);

    // Fetch sale transaction details for populated docs
    const enrichedDocs = await Promise.all(
      docs.map(async (doc: any) => {
        let saleInfo: any = null;
        if (doc.saleType === 'ride') {
          saleInfo = await RideSale.findById(doc.saleId).select('transactionId soldAt paymentMethod status').lean();
        } else {
          saleInfo = await Sale.findById(doc.saleId).select('transactionId soldAt paymentMethod status').lean();
        }
        return {
          ...doc,
          id: doc._id.toString(),
          transactionId: saleInfo?.transactionId || 'UNKNOWN',
          soldAt: saleInfo?.soldAt || doc.requestedAt,
          paymentMethod: saleInfo?.paymentMethod || 'cash',
        };
      })
    );

    const pendingStats = await CancellationRequest.aggregate([
      { $match: { status: 'PENDING' } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$originalSaleAmount' },
        },
      },
    ]);

    return {
      requests: enrichedDocs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        pendingCount: pendingStats[0]?.count || 0,
        pendingAmount: pendingStats[0]?.totalAmount || 0,
      },
    };
  }

  /**
   * Approve a cancellation request (Admin / Super Admin).
   */
  static async approveRequest(
    requestId: string,
    adminUser: AuthUser,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    await connectToDatabase();

    const request = await CancellationRequest.findById(requestId);
    if (!request) {
      throw new Error('Cancellation request not found');
    }

    if (request.exhibitionId) {
      requireExhibitionAccess(adminUser, request.exhibitionId);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Cancellation request is already ${request.status.toLowerCase()}`);
    }

    let saleDoc: any = null;
    let ticketModel: any = null;
    const isRide = request.saleType === 'ride';

    if (isRide) {
      saleDoc = await RideSale.findById(request.saleId);
      ticketModel = RideTicket;
    } else {
      saleDoc = await Sale.findById(request.saleId);
      ticketModel = Ticket;
    }

    if (!saleDoc) {
      throw new Error('Associated transaction not found');
    }

    const now = new Date();

    // 1. Soft-cancel Sale / RideSale
    saleDoc.status = 'cancelled';
    saleDoc.cancelledAt = now;
    saleDoc.cancelledBy = new mongoose.Types.ObjectId(adminUser.id);
    saleDoc.cancelReason = request.cancellationReason;
    saleDoc.cancellationStatus = 'approved';
    await saleDoc.save();

    // 2. Soft-cancel linked tickets
    await ticketModel.updateMany(
      { _id: { $in: saleDoc.tickets } },
      { $set: { status: 'cancelled', cancellationStatus: 'approved' } }
    );

    // 3. Update CancellationRequest status
    request.status = 'APPROVED';
    request.reviewedBy = new mongoose.Types.ObjectId(adminUser.id);
    request.reviewedAt = now;
    request.approvedAt = now;
    await request.save();

    // 4. Audit Logging
    await AuditService.create({
      action: 'cancellation_request.approve' as any,
      performedBy: adminUser.id as any,
      performedByRole: adminUser.role,
      targetType: 'cancellation_request' as any,
      targetId: request._id.toString(),
      details: {
        requestId: request.requestId,
        transactionId: saleDoc.transactionId,
        saleType: request.saleType,
        totalAmount: saleDoc.totalAmount,
        reason: request.cancellationReason,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    await AuditService.create({
      action: 'transaction.cancelled' as any,
      performedBy: adminUser.id as any,
      performedByRole: adminUser.role,
      targetType: (isRide ? 'ride_sale' : 'sale') as any,
      targetId: saleDoc._id.toString(),
      details: {
        reason: request.cancellationReason,
        ticketCount: saleDoc.ticketCount,
        totalAmount: saleDoc.totalAmount,
        requestId: request.requestId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        approvedByAdmin: true,
      },
    });

    // 5. Notify Counter Staff who requested it
    try {
      await NotificationService.sendBroadcastNotifications({
        senderId: adminUser.id,
        targetType: 'users',
        recipientUserIds: [request.createdBy.toString()],
        title: 'Cancellation Approved',
        message: `Your cancellation request for transaction ${saleDoc.transactionId} was approved.`,
        type: 'info',
      });
    } catch (notifErr) {
      console.error('Failed to notify requester of approval:', notifErr);
    }

    return { request, sale: saleDoc };
  }

  /**
   * Reject a cancellation request (Admin / Super Admin).
   */
  static async rejectRequest(
    requestId: string,
    adminUser: AuthUser,
    rejectionReason?: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    await connectToDatabase();

    const request = await CancellationRequest.findById(requestId);
    if (!request) {
      throw new Error('Cancellation request not found');
    }

    if (request.exhibitionId) {
      requireExhibitionAccess(adminUser, request.exhibitionId);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Cancellation request is already ${request.status.toLowerCase()}`);
    }

    let saleDoc: any = null;
    let ticketModel: any = null;
    const isRide = request.saleType === 'ride';

    if (isRide) {
      saleDoc = await RideSale.findById(request.saleId);
      ticketModel = RideTicket;
    } else {
      saleDoc = await Sale.findById(request.saleId);
      ticketModel = Ticket;
    }

    if (!saleDoc) {
      throw new Error('Associated transaction not found');
    }

    const now = new Date();

    // 1. Reset Sale cancellationStatus to 'rejected' (keep status: 'active')
    saleDoc.cancellationStatus = 'rejected';
    saleDoc.pendingCancellationRequestId = undefined;
    await saleDoc.save();

    // 2. Reset linked tickets cancellationStatus to 'rejected' (keep status: 'valid')
    await ticketModel.updateMany(
      { _id: { $in: saleDoc.tickets } },
      { $set: { cancellationStatus: 'rejected' } }
    );

    // 3. Update CancellationRequest status
    request.status = 'REJECTED';
    request.rejectionReason = rejectionReason?.trim();
    request.reviewedBy = new mongoose.Types.ObjectId(adminUser.id);
    request.reviewedAt = now;
    request.rejectedAt = now;
    await request.save();

    // 4. Audit Logging
    await AuditService.create({
      action: 'cancellation_request.reject' as any,
      performedBy: adminUser.id as any,
      performedByRole: adminUser.role,
      targetType: 'cancellation_request' as any,
      targetId: request._id.toString(),
      details: {
        requestId: request.requestId,
        transactionId: saleDoc.transactionId,
        rejectionReason: rejectionReason?.trim(),
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    // 5. Notify Counter Staff who requested it
    try {
      await NotificationService.sendBroadcastNotifications({
        senderId: adminUser.id,
        targetType: 'users',
        recipientUserIds: [request.createdBy.toString()],
        title: 'Cancellation Rejected',
        message: `Your cancellation request for ${saleDoc.transactionId} was rejected. Ticket remains active.`,
        type: 'alert',
      });
    } catch (notifErr) {
      console.error('Failed to notify requester of rejection:', notifErr);
    }

    return { request, sale: saleDoc };
  }
}
