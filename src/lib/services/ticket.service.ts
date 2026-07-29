import mongoose from 'mongoose';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { Exhibition as ExhibitionModel } from '@/lib/db/models/exhibition.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { connectToDatabase } from '@/lib/db/connection';
import { AuditService } from '@/lib/services/audit.service';
import { createQrPayload, generateQrDataUrl, parseQrPayload } from '@/lib/utils/qr';
import { sha256, generateTicketNumber, generateTransactionId } from '@/lib/utils/crypto';
import { escapeRegex } from '@/lib/utils/sanitize';
import type { Ticket, CreateTicketInput, ValidateTicketInput, TicketValidationResult } from '@/types/ticket.types';
import type { PaginationParams, PaginationMeta } from '@/types/api.types';

/**
 * Ticket management service.
 * Handles ticket creation, validation, and querying.
 */
export const TicketService = {
  async create(data: CreateTicketInput & { source?: 'admin' | 'counter'; notes?: string }, userId: string): Promise<{ tickets: Ticket[]; qrDataUrls: string[] }> {
    await connectToDatabase();

    // 1. Fetch current user context performing creation
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User performing transaction not found');
    }

    // 2. Validate exhibition exists and is active (or upcoming/draft if admin is generating)
    const exhibition = await ExhibitionModel.findOne({ _id: data.exhibitionId, archive: { $ne: true } });
    if (!exhibition) {
      throw new Error('Exhibition not found or archived');
    }

    const isCounter = data.source === 'counter' || user.role !== 'admin';
    if (isCounter && exhibition.status !== 'active') {
      throw new Error(`Exhibition is currently in '${exhibition.status}' state and is closed to active counter ticketing sales.`);
    }

    // 3. Validate ticket type exists inside exhibition configured options
    const tType = exhibition.ticketTypes.find(
      (t: { name: string; price: number; maxQuantity?: number }) => t.name.toLowerCase() === data.ticketType.toLowerCase()
    );
    if (!tType) {
      throw new Error(`Ticket class '${data.ticketType}' is not configured for this exhibition.`);
    }

    const price = tType.price; // in paise
    const quantity = data.quantity || 1;

    // 4. Validate capacity constraints
    if (tType.maxQuantity) {
      const classCount = await TicketModel.countDocuments({
        exhibitionId: exhibition._id,
        ticketType: tType.name,
        status: { $ne: 'cancelled' },
      });
      if (classCount + quantity > tType.maxQuantity) {
        throw new Error(`Capacity limit reached for ticket class '${tType.name}'. Only ${tType.maxQuantity - classCount} slots available.`);
      }
    }

    if (exhibition.capacity > 0) {
      const overallCount = await TicketModel.countDocuments({
        exhibitionId: exhibition._id,
        status: { $ne: 'cancelled' },
      });
      if (overallCount + quantity > exhibition.capacity) {
        throw new Error(`Overall capacity limit reached for this exhibition. Only ${exhibition.capacity - overallCount} slots available.`);
      }
    }

    const secret = process.env.QR_HMAC_SECRET || 'dev-qr-secret-only-for-local-development-change-in-production';

    // Issue 1 Ticket Bundle per transaction (1 QR code representing total quantity)
    const ticketNumber = generateTicketNumber('EXH');
    const primaryTransactionId = generateTransactionId('TXN');
    const tempToken = `temp-${Date.now()}`;
    const totalAmount = price * quantity;

    const tDoc = await TicketModel.create({
      ticketNumber,
      exhibitionId: exhibition._id,
      ticketType: tType.name,
      price, // unit price in paise
      qrPayload: tempToken,
      qrHash: tempToken,
      status: 'valid',
      scanCount: 0,
      quantity,
      usedCount: 0,
      remainingCount: quantity,
      soldBy: user._id,
      soldAt: new Date(),
      paymentMethod: data.paymentMethod || 'free',
      paymentStatus: data.paymentMethod === 'free' ? 'free' : 'paid',
      source: data.source || 'counter',
      createdBy: user._id,
      customerName: data.customerName?.trim() || undefined,
      customerPhone: data.customerPhone?.trim() || undefined,
      metadata: {
        notes: data.notes?.trim() || undefined,
        transactionId: primaryTransactionId,
        upiTransactionRef: data.upiTransactionRef?.trim() || undefined,
      },
    });

    // Secure cryptographic signature payload referencing the ticket bundle
    const qrPayload = createQrPayload(
      {
        ticketId: tDoc._id.toString(),
        exhibitionId: exhibition._id.toString(),
        timestamp: Date.now(),
      },
      secret
    );
    const qrHash = sha256(qrPayload);

    // Second-pass update
    tDoc.qrPayload = qrPayload;
    tDoc.qrHash = qrHash;
    await tDoc.save();

    // Renders single Base64 QR Image for the whole bundle
    const qrDataUrl = await generateQrDataUrl(qrPayload);

    const createdTicketJSON = {
      ...tDoc.toJSON(),
      quantity,
      usedCount: 0,
      remainingCount: quantity,
    };

    // 6. Create the unified Sale transaction record
    await SaleModel.create({
      transactionId: primaryTransactionId,
      exhibitionId: exhibition._id,
      tickets: [tDoc._id],
      ticketCount: quantity,
      totalAmount,
      paymentMethod: data.paymentMethod || 'free',
      upiTransactionRef: data.upiTransactionRef?.trim() || undefined,
      soldBy: user._id,
      soldAt: new Date(),
      ticketType: tType.name,
      unitPrice: price,
      customerName: data.customerName?.trim() || undefined,
      customerPhone: data.customerPhone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      paymentStatus: data.paymentMethod === 'free' ? 'free' : 'paid',
      cashReceived: data.cashReceived,
      changeGiven: data.changeGiven,
    });

    // 7. Write audit log
    await AuditService.create({
      action: 'ticket.create',
      performedBy: user._id.toString(),
      performedByRole: user.role,
      targetType: 'ticket',
      targetId: tDoc._id.toString(),
      exhibitionId: exhibition._id.toString(),
      details: {
        exhibitionName: exhibition.name,
        ticketCount: quantity,
        ticketType: tType.name,
        totalAmount,
        transactionId: primaryTransactionId,
      },
    });

    return {
      tickets: [createdTicketJSON as unknown as Ticket],
      qrDataUrls: [qrDataUrl],
    };
  },

  async validate(data: ValidateTicketInput, gateStaffId: string): Promise<TicketValidationResult> {
    await connectToDatabase();

    const secret = process.env.QR_HMAC_SECRET || 'dev-qr-secret-only-for-local-development-change-in-production';
    const qrPayload = data.qrPayload.trim();

    const { TicketScan: TicketScanModel } = await import('@/lib/db/models/ticket-scan.model');

    // ── Duplicate Scan Suppression (2-second window) ──
    const cooldownWindow = new Date(Date.now() - 2000);
    const existingRecentScan = await TicketScanModel.findOne({
      qrPayloadRaw: qrPayload,
      exhibitionId: data.exhibitionId,
      scannedAt: { $gte: cooldownWindow },
    }).sort({ scannedAt: -1 });

    if (existingRecentScan) {
      let ticketObj: Ticket | undefined = undefined;
      const parsedPayload = parseQrPayload(qrPayload, secret);
      if (parsedPayload && parsedPayload.ticketId && mongoose.Types.ObjectId.isValid(parsedPayload.ticketId)) {
        const doc = await TicketModel.findById(parsedPayload.ticketId);
        if (doc) ticketObj = doc.toJSON() as unknown as Ticket;
      }

      return {
        valid: existingRecentScan.result === 'admitted',
        result: existingRecentScan.result as any,
        ticket: ticketObj,
        message: existingRecentScan.result === 'admitted'
          ? `Admitted recently (${existingRecentScan.reason || 'Entry granted'}).`
          : existingRecentScan.reason || 'Duplicate scan within cooldown window.',
      };
    }

    // 1. Fetch Staff User
    const staffUser = await UserModel.findById(gateStaffId);

    // 2. Parse Cryptographic HMAC QR Payload
    const payloadData = parseQrPayload(qrPayload, secret);
    if (!payloadData || !payloadData.ticketId || !mongoose.Types.ObjectId.isValid(payloadData.ticketId)) {
      const qrHash = sha256(qrPayload);
      const ticketByHash = await TicketModel.findOne({ qrHash });

      await TicketScanModel.create({
        ticketId: ticketByHash ? ticketByHash._id : undefined,
        exhibitionId: new mongoose.Types.ObjectId(data.exhibitionId),
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_unknown',
        qrPayloadRaw: qrPayload,
        reason: 'Cryptographic signature is invalid or payload has been tampered with.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_unknown',
        ticket: ticketByHash ? (ticketByHash.toJSON() as unknown as Ticket) : undefined,
        message: 'Invalid or forged QR code. Cryptographic verification failed.',
      };
    }

    // 3. Fetch Ticket Bundle document from MongoDB
    const ticket = await TicketModel.findById(payloadData.ticketId);
    if (!ticket) {
      await TicketScanModel.create({
        exhibitionId: new mongoose.Types.ObjectId(data.exhibitionId),
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_unknown',
        qrPayloadRaw: qrPayload,
        reason: 'Ticket record not found in database.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_unknown',
        message: 'Ticket record not found in database.',
      };
    }

    const ticketStatusBefore = ticket.status;

    // Verify Exhibition Scope match
    if (ticket.exhibitionId.toString() !== data.exhibitionId) {
      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: new mongoose.Types.ObjectId(data.exhibitionId),
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_wrong_exhibition',
        qrPayloadRaw: qrPayload,
        reason: `Ticket belongs to a different exhibition.`,
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_wrong_exhibition',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: 'This ticket is issued for a different exhibition.',
      };
    }

    // Ensure Gate Exhibition active
    const gateExhibition = await ExhibitionModel.findById(data.exhibitionId);
    if (!gateExhibition || gateExhibition.status !== 'active') {
      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: new mongoose.Types.ObjectId(data.exhibitionId),
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_expired',
        qrPayloadRaw: qrPayload,
        reason: 'Exhibition status is not active.',
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_expired',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: `Exhibition '${gateExhibition?.name || 'Exhibition'}' is currently closed for entry.`,
      };
    }

    // 4. Verify Ticket Status (Cancelled / Expired / Exhausted)
    if (ticket.status === 'cancelled') {
      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_invalid',
        qrPayloadRaw: qrPayload,
        reason: 'Ticket bundle is marked cancelled (refunded or voided).',
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_invalid',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: 'Ticket bundle has been cancelled or voided. Access denied.',
      };
    }

    if (ticket.status === 'expired') {
      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_expired',
        qrPayloadRaw: qrPayload,
        reason: 'Ticket bundle validity date has expired.',
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_expired',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: 'This ticket bundle has expired. Validity date is past.',
      };
    }

    // Backwards-compatible bundle fields fallback
    const totalQty = ticket.quantity || 1;
    const prevUsed = ticket.usedCount || 0;
    const prevRemaining = ticket.remainingCount ?? (totalQty - prevUsed);

    if (ticket.status === 'used' || prevRemaining <= 0) {
      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_used',
        qrPayloadRaw: qrPayload,
        reason: 'Ticket bundle already completed. All entries used.',
        ticketStatusBefore,
        ticketStatusAfter: 'used',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_used',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: `All ${totalQty} entries on this ticket bundle have already been used.`,
        quantity: totalQty,
        usedCount: totalQty,
        remainingCount: 0,
      };
    }

    // 5. Calculate admissions count for this scan
    const requestedAdmitCount = Math.max(1, data.countToAdmit || 1);
    const countToAdmit = Math.min(requestedAdmitCount, prevRemaining);

    if (countToAdmit <= 0) {
      return {
        valid: false,
        result: 'rejected_used',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: `No remaining entries available on this ticket bundle.`,
        quantity: totalQty,
        usedCount: prevUsed,
        remainingCount: prevRemaining,
      };
    }

    const newUsed = prevUsed + countToAdmit;
    const newRemaining = prevRemaining - countToAdmit;
    const nextStatus = newRemaining === 0 ? 'used' : 'partially_used';

    // ATOMIC MONGODB UPDATE WITH GUARD CONDITION
    const updatedTicket = await TicketModel.findOneAndUpdate(
      {
        _id: ticket._id,
        remainingCount: { $gte: countToAdmit },
        status: { $in: ['valid', 'partially_used'] },
      },
      {
        $inc: { usedCount: countToAdmit, remainingCount: -countToAdmit, scanCount: 1 },
        $set: {
          status: nextStatus,
          usedAt: new Date(),
          usedBy: new mongoose.Types.ObjectId(gateStaffId),
        },
      },
      { new: true }
    );

    if (!updatedTicket) {
      return {
        valid: false,
        result: 'rejected_used',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: `Insufficient remaining entries on ticket bundle or concurrent scan detected. Please retry.`,
        quantity: totalQty,
        usedCount: prevUsed,
        remainingCount: prevRemaining,
      };
    }

    // Log Scan Entry
    await TicketScanModel.create({
      ticketId: updatedTicket._id,
      exhibitionId: gateExhibition._id,
      scannedBy: new mongoose.Types.ObjectId(gateStaffId),
      scannedAt: new Date(),
      result: 'admitted',
      qrPayloadRaw: qrPayload,
      reason: `Admitted ${countToAdmit} visitor(s). ${newRemaining} remaining.`,
      ticketStatusBefore,
      ticketStatusAfter: nextStatus,
      admittedCount: countToAdmit,
      previousUsedCount: prevUsed,
      newUsedCount: newUsed,
      previousRemainingCount: prevRemaining,
      newRemainingCount: newRemaining,
      gateId: data.gateId,
    });

    // Write to AuditLogs
    await AuditService.create({
      action: 'ticket.scan',
      performedBy: gateStaffId,
      performedByRole: staffUser?.role || 'gate',
      targetType: 'ticket',
      targetId: updatedTicket._id.toString(),
      exhibitionId: gateExhibition._id.toString(),
      details: {
        ticketNumber: updatedTicket.ticketNumber,
        ticketType: updatedTicket.ticketType,
        admittedCount: countToAdmit,
        previousRemainingCount: prevRemaining,
        newRemainingCount: newRemaining,
        status: nextStatus,
      },
    });

    const formattedMessage =
      newRemaining === 0
        ? `Access Granted! All ${updatedTicket.quantity} visitor(s) admitted.`
        : `Access Granted! Admitted ${countToAdmit} visitor(s). ${newRemaining} entry(s) remaining on bundle.`;

    return {
      valid: true,
      result: 'admitted',
      ticket: updatedTicket.toJSON() as unknown as Ticket,
      message: formattedMessage,
      quantity: updatedTicket.quantity,
      usedCount: updatedTicket.usedCount,
      remainingCount: updatedTicket.remainingCount,
      admittedThisScan: countToAdmit,
    };
  },

  async listScans(
    params: PaginationParams & {
      exhibitionId?: string;
      scannedBy?: string;
      result?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ data: any[]; pagination: PaginationMeta }> {
    await connectToDatabase();
    const { TicketScan: TicketScanModel } = await import('@/lib/db/models/ticket-scan.model');

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (params.exhibitionId) {
      query.exhibitionId = new mongoose.Types.ObjectId(params.exhibitionId);
    }
    if (params.scannedBy) {
      query.scannedBy = new mongoose.Types.ObjectId(params.scannedBy);
    }
    if (params.result) {
      query.result = params.result;
    }
    if (params.startDate || params.endDate) {
      query.scannedAt = {};
      if (params.startDate) {
        query.scannedAt.$gte = params.startDate;
      }
      if (params.endDate) {
        query.scannedAt.$lte = params.endDate;
      }
    }

    const total = await TicketScanModel.countDocuments(query);
    const docs = await TicketScanModel.find(query)
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ticketId', 'ticketNumber ticketType customerName')
      .populate('exhibitionId', 'name venue')
      .populate('scannedBy', 'name staffId');

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map((d) => d.toJSON()),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  async getGateStats(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{ admittedCount: number; totalScans: number; securityFlags: number }> {
    await connectToDatabase();
    const { TicketScan: TicketScanModel } = await import('@/lib/db/models/ticket-scan.model');

    const query: Record<string, any> = { scannedBy: new mongoose.Types.ObjectId(userId) };
    if (dateRange) {
      query.scannedAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const scans = await TicketScanModel.find(query);

    let admittedCount = 0;
    let totalScans = scans.length;
    let securityFlags = 0;

    for (const scan of scans) {
      if (scan.result === 'admitted') {
        admittedCount += scan.admittedCount || 1;
      } else if (scan.result.startsWith('rejected')) {
        securityFlags++;
      }
    }

    return {
      admittedCount,
      totalScans,
      securityFlags,
    };
  },

  async findById(id: string): Promise<Ticket | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await TicketModel.findById(id)
      .populate('exhibitionId', 'name venue startDate endDate')
      .populate('soldBy', 'name staffId')
      .populate('usedBy', 'name staffId')
      .populate('createdBy', 'name staffId');
    
    if (doc) return doc.toJSON() as unknown as Ticket;

    // Fallback: Check if it's a ride ticket
    const { RideTicket: RideTicketModel } = await import('@/lib/db/models/ride-ticket.model');
    const rideDoc = await RideTicketModel.findById(id)
      .populate('exhibitionId', 'name venue startDate endDate')
      .populate('rideId', 'name price')
      .populate('soldBy', 'name staffId');
    
    return rideDoc ? (rideDoc.toJSON() as unknown as any) : null;
  },

  async listByExhibition(
    exhibitionId: string,
    params: PaginationParams & { search?: string; status?: string; ticketType?: string; startDate?: string; endDate?: string }
  ): Promise<{ data: Ticket[]; pagination: PaginationMeta; stats: { totalTickets: number; totalRevenue: number; validCount: number; usedCount: number } }> {
    await connectToDatabase();

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (exhibitionId) {
      query.exhibitionId = new mongoose.Types.ObjectId(exhibitionId);
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.ticketType) {
      query.ticketType = params.ticketType;
    }

    if (params.startDate || params.endDate) {
      query.soldAt = {};
      if (params.startDate) {
        const sDate = new Date(params.startDate);
        sDate.setHours(0, 0, 0, 0);
        query.soldAt.$gte = sDate;
      }
      if (params.endDate) {
        const eDate = new Date(params.endDate);
        eDate.setHours(23, 59, 59, 999);
        query.soldAt.$lte = eDate;
      }
    }

    if (params.search) {
      const safeSearch = escapeRegex(params.search);
      query.$or = [
        { ticketNumber: { $regex: safeSearch, $options: 'i' } },
        { customerName: { $regex: safeSearch, $options: 'i' } },
        { customerPhone: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const total = await TicketModel.countDocuments(query);
    const docs = await TicketModel.find(query)
      .sort({ soldAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('exhibitionId', 'name venue')
      .populate('soldBy', 'name staffId');

    const totalPages = Math.ceil(total / limit);

    // Compute summary stats for current filter scope
    const totalRevenueResult = await TicketModel.aggregate([
      { $match: { ...query, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const validCount = await TicketModel.countDocuments({ ...query, status: 'valid' });
    const usedCount = await TicketModel.countDocuments({ ...query, status: 'used' });

    return {
      data: docs.map((d) => d.toJSON() as unknown as Ticket),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
      stats: {
        totalTickets: total,
        totalRevenue,
        validCount,
        usedCount,
      },
    };
  },

  async listBySeller(userId: string, params: PaginationParams): Promise<{ data: Ticket[]; pagination: PaginationMeta }> {
    await connectToDatabase();

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query = { soldBy: new mongoose.Types.ObjectId(userId) };

    const total = await TicketModel.countDocuments(query);
    const docs = await TicketModel.find(query)
      .sort({ soldAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('exhibitionId', 'name venue');

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map((d) => d.toJSON() as unknown as Ticket),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  async cancel(id: string, userId: string): Promise<Ticket | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await TicketModel.findById(id);
    if (!doc) return null;

    if (doc.status === 'cancelled') {
      throw new Error('Ticket is already cancelled');
    }

    const prevStatus = doc.status;
    doc.status = 'cancelled';
    await doc.save();

    // Fetch user performing cancellation
    const user = await UserModel.findById(userId);

    // Log cancellation audit trail
    await AuditService.create({
      action: 'ticket.cancel',
      performedBy: userId,
      performedByRole: user?.role || 'admin',
      targetType: 'ticket',
      targetId: doc._id.toString(),
      exhibitionId: doc.exhibitionId.toString(),
      details: {
        ticketNumber: doc.ticketNumber,
        prevStatus,
      },
    });

    return doc.toJSON() as unknown as Ticket;
  },
};
