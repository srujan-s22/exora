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

    const createdTickets = [];
    const qrDataUrls = [];
    let primaryTransactionId = '';

    // Create tickets double-pass flow inside a loop to ensure payload uses generated MongoDB _id
    for (let i = 0; i < quantity; i++) {
      const ticketNumber = generateTicketNumber('EXH');
      const ticketTransactionId = generateTransactionId('TXN');
      if (i === 0) {
        primaryTransactionId = ticketTransactionId;
      }
      
      const tempToken = `temp-${i}-${Date.now()}`;

      const tDoc = await TicketModel.create({
        ticketNumber,
        exhibitionId: exhibition._id,
        ticketType: tType.name,
        price,
        qrPayload: tempToken,
        qrHash: tempToken,
        status: 'valid',
        scanCount: 0,
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
          transactionId: ticketTransactionId,
          upiTransactionRef: data.upiTransactionRef?.trim() || undefined,
        },
      });

      // Secure cryptographic signature payload containing actual MongoDB _id
      const qrPayload = createQrPayload(
        {
          ticketId: tDoc._id.toString(),
          exhibitionId: exhibition._id.toString(),
          timestamp: Date.now(),
        },
        secret
      );
      const qrHash = sha256(qrPayload);

      // Second-pass updates
      tDoc.qrPayload = qrPayload;
      tDoc.qrHash = qrHash;
      await tDoc.save();

      // Renders Base64 Image
      const qrDataUrl = await generateQrDataUrl(qrPayload);

      createdTickets.push(tDoc.toJSON());
      qrDataUrls.push(qrDataUrl);
    }

    // 6. Create the unified Sale transaction record
    const totalAmount = price * quantity;
    await SaleModel.create({
      transactionId: primaryTransactionId,
      exhibitionId: exhibition._id,
      tickets: createdTickets.map((t) => t.id),
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
      targetId: createdTickets[0].id.toString(),
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
      tickets: createdTickets as unknown as Ticket[],
      qrDataUrls,
    };
  },

  async validate(data: ValidateTicketInput, gateStaffId: string): Promise<TicketValidationResult> {
    await connectToDatabase();

    const secret = process.env.QR_HMAC_SECRET || 'dev-qr-secret-only-for-local-development-change-in-production';
    const qrPayload = data.qrPayload.trim();

    const { TicketScan: TicketScanModel } = await import('@/lib/db/models/ticket-scan.model');

    // ── Duplicate Scan Suppression (2-second window) ──
    // If this exact payload was scanned at this exhibition in the last 2 seconds,
    // return the cached result of that recent scan without logging a new scan entry or warning.
    const cooldownWindow = new Date(Date.now() - 2000);
    const existingRecentScan = await TicketScanModel.findOne({
      qrPayloadRaw: qrPayload,
      exhibitionId: data.exhibitionId,
      scannedAt: { $gte: cooldownWindow }
    }).sort({ scannedAt: -1 });

    if (existingRecentScan) {
      let ticketObj: Ticket | undefined = undefined;
      const parsedPayload = parseQrPayload(qrPayload, secret);
      if (parsedPayload && mongoose.Types.ObjectId.isValid(parsedPayload.ticketId)) {
        const ticketDoc = await TicketModel.findById(parsedPayload.ticketId);
        if (ticketDoc) {
          ticketObj = ticketDoc.toJSON() as unknown as Ticket;
        }
      }

      const isAdmitted = existingRecentScan.result === 'admitted';
      
      let friendlyMessage = 'Scan ignored (duplicate scan within cooldown).';
      if (existingRecentScan.result === 'admitted') {
        friendlyMessage = 'Access Granted. Welcome!';
      } else if (existingRecentScan.result === 'rejected_used') {
        friendlyMessage = 'Duplicate ticket: Already used.';
      } else if (existingRecentScan.reason) {
        friendlyMessage = existingRecentScan.reason;
      }

      return {
        valid: isAdmitted,
        result: existingRecentScan.result,
        ticket: ticketObj,
        message: friendlyMessage,
      };
    }

    // 1. Verify QR Payload Cryptographic Signature
    const parsedPayload = parseQrPayload(qrPayload, secret);
    
    const { User: UserModel } = await import('@/lib/db/models/user.model');
    const { Exhibition: ExhibitionModel } = await import('@/lib/db/models/exhibition.model');

    const staffUser = await UserModel.findById(gateStaffId);
    const gateExhibition = await ExhibitionModel.findById(data.exhibitionId);
    
    if (!gateExhibition) {
      throw new Error('Exhibition not found');
    }

    if (!parsedPayload) {
      // Signature is invalid -> Suspected Forgery/Fake QR
      await TicketScanModel.create({
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_unknown',
        qrPayloadRaw: qrPayload,
        reason: 'HMAC signature verification failed. Forgery suspected.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_unknown',
        message: 'Invalid ticket payload. Decryption or signature check failed.',
      };
    }

    const { ticketId } = parsedPayload;

    // 2. Fetch the Ticket Record
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      await TicketScanModel.create({
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_invalid',
        qrPayloadRaw: qrPayload,
        reason: 'Invalid ticket ID format.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_invalid',
        message: 'Ticket verification failed: Invalid ticket reference.',
      };
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      await TicketScanModel.create({
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_invalid',
        qrPayloadRaw: qrPayload,
        reason: 'Ticket record not found in database.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_invalid',
        message: 'Ticket not found in systems database.',
      };
    }

    const ticketStatusBefore = ticket.status;

    // 3. Verify Wrong Exhibition Scoping
    if (ticket.exhibitionId.toString() !== gateExhibition._id.toString()) {
      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_wrong_exhibition',
        qrPayloadRaw: qrPayload,
        reason: `Wrong exhibition. Ticket is configured for exhibition ID: ${ticket.exhibitionId}. Current gate exhibition: ${gateExhibition._id}`,
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_wrong_exhibition',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: `Ticket belongs to a different exhibition. Current gate is configured for '${gateExhibition.name}'.`,
      };
    }

    // Check exhibition is active
    if (gateExhibition.status !== 'active') {
      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_expired',
        qrPayloadRaw: qrPayload,
        reason: `Exhibition status is '${gateExhibition.status}' (inactive). Entry scanning is closed.`,
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_expired',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: `Exhibition '${gateExhibition.name}' is currently not active (status: ${gateExhibition.status}). Entry scanning is closed.`,
      };
    }

    // 4. Verify Ticket Status (Cancelled / Expired / Already Used)
    if (ticket.status === 'cancelled') {
      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_invalid',
        qrPayloadRaw: qrPayload,
        reason: 'Ticket is marked cancelled (refunded or voided).',
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_invalid',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: 'Ticket has been cancelled or voided. Access denied.',
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
        reason: 'Ticket validity date has expired.',
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_expired',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: 'This ticket has expired. Validity date is past.',
      };
    }

    if (ticket.status === 'used') {
      // Find previous scan time for friendly double-scan warning message
      const lastScan = await TicketScanModel.findOne({ ticketId: ticket._id, result: 'admitted' }).sort({ scannedAt: -1 });
      const lastScanStr = lastScan 
        ? `Admitted at ${new Intl.DateTimeFormat('en-IN', { timeStyle: 'medium' }).format(lastScan.scannedAt)} by Gate Staff.`
        : 'Already used.';

      await TicketScanModel.create({
        ticketId: ticket._id,
        exhibitionId: gateExhibition._id,
        scannedBy: new mongoose.Types.ObjectId(gateStaffId),
        scannedAt: new Date(),
        result: 'rejected_used',
        qrPayloadRaw: qrPayload,
        reason: 'Duplicate ticket entry attempt.',
        ticketStatusBefore,
        ticketStatusAfter: ticketStatusBefore,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_used',
        ticket: ticket.toJSON() as unknown as Ticket,
        message: `Duplicate ticket: ${lastScanStr}`,
      };
    }

    // 5. Admit entry and update ticket
    ticket.status = 'used';
    ticket.usedAt = new Date();
    ticket.usedBy = new mongoose.Types.ObjectId(gateStaffId);
    ticket.scanCount = (ticket.scanCount || 0) + 1;
    await ticket.save();

    await TicketScanModel.create({
      ticketId: ticket._id,
      exhibitionId: gateExhibition._id,
      scannedBy: new mongoose.Types.ObjectId(gateStaffId),
      scannedAt: new Date(),
      result: 'admitted',
      qrPayloadRaw: qrPayload,
      reason: 'Valid ticket, access granted.',
      ticketStatusBefore,
      ticketStatusAfter: 'used',
      gateId: data.gateId,
    });

    // 6. Write to AuditLogs
    await AuditService.create({
      action: 'ticket.scan',
      performedBy: gateStaffId,
      performedByRole: staffUser?.role || 'gate',
      targetType: 'ticket',
      targetId: ticket._id.toString(),
      exhibitionId: gateExhibition._id.toString(),
      details: {
        ticketNumber: ticket.ticketNumber,
        ticketType: ticket.ticketType,
        result: 'admitted',
      },
    });

    return {
      valid: true,
      result: 'admitted',
      ticket: ticket.toJSON() as unknown as Ticket,
      message: 'Access Granted. Welcome!',
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
        admittedCount++;
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

  async listByExhibition(exhibitionId: string, params: PaginationParams & { search?: string; status?: string; ticketType?: string }): Promise<{ data: Ticket[]; pagination: PaginationMeta }> {
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
