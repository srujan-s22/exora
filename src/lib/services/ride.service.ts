import mongoose from 'mongoose';
import { Ride as RideModel } from '@/lib/db/models/ride.model';
import { RideTicket as RideTicketModel } from '@/lib/db/models/ride-ticket.model';
import { RideScan as RideScanModel } from '@/lib/db/models/ride-scan.model';
import { RideSale as RideSaleModel } from '@/lib/db/models/ride-sale.model';
import { Exhibition as ExhibitionModel } from '@/lib/db/models/exhibition.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';
import { AuditService } from '@/lib/services/audit.service';
import { generateHmac, verifyHmac, sha256, generateTicketNumber, generateTransactionId } from '@/lib/utils/crypto';
import { generateQrDataUrl } from '@/lib/utils/qr';
import { escapeRegex } from '@/lib/utils/sanitize';
import type {
  Ride,
  RideTicket,
  RideScan,
  RideSale,
  CreateRideInput,
  UpdateRideInput,
  CreateRideTicketInput,
  ValidateRideTicketInput,
  RideTicketValidationResult
} from '@/types/ride.types';
import type { PaginationParams, PaginationMeta } from '@/types/api.types';
import { logger } from '@/lib/utils/logger';

/**
 * Ride/Game QR Payloads are structured as:
 * ticketId:exhibitionId:rideId:timestamp:hmacSignature
 */
export function createRideQrPayload(
  data: { ticketId: string; exhibitionId: string; rideId: string; timestamp: number },
  secret: string
): string {
  const payload = `${data.ticketId}:${data.exhibitionId}:${data.rideId}:${data.timestamp}`;
  const signature = generateHmac(payload, secret);
  return `${payload}:${signature}`;
}

export function parseRideQrPayload(
  raw: string,
  secret: string
): { ticketId: string; exhibitionId: string; rideId: string; timestamp: number } | null {
  const parts = raw.split(':');
  if (parts.length !== 5) return null;

  const [ticketId, exhibitionId, rideId, timestampStr, signature] = parts;
  const payload = `${ticketId}:${exhibitionId}:${rideId}:${timestampStr}`;
  
  if (!verifyHmac(payload, signature, secret)) return null;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  return { ticketId, exhibitionId, rideId, timestamp };
}

export const RideService = {
  async create(data: CreateRideInput, userId: string): Promise<Ride> {
    await connectToDatabase();

    const exhibition = await ExhibitionModel.findById(data.exhibitionId);
    if (!exhibition) {
      throw new Error('Exhibition not found');
    }

    const doc = await RideModel.create({
      name: data.name,
      description: data.description,
      price: data.price,
      exhibitionId: new mongoose.Types.ObjectId(data.exhibitionId),
      assignedStaff: data.assignedStaff?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
      status: data.status || 'open',
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    const user = await UserModel.findById(userId);
    await AuditService.create({
      action: 'exhibition.update', // Reuse existing action or audit log standard
      performedBy: userId,
      performedByRole: user?.role || 'admin',
      targetType: 'exhibition',
      targetId: exhibition._id.toString(),
      exhibitionId: exhibition._id.toString(),
      details: {
        message: `Ride/Game '${doc.name}' created inside exhibition.`,
        rideId: doc._id.toString(),
        rideName: doc.name,
        price: doc.price,
      },
    });

    return doc.toJSON() as unknown as Ride;
  },

  async update(id: string, data: UpdateRideInput, userId: string): Promise<Ride | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await RideModel.findById(id);
    if (!doc) return null;

    if (data.name !== undefined) doc.name = data.name;
    if (data.description !== undefined) doc.description = data.description;
    if (data.price !== undefined) doc.price = data.price;
    if (data.status !== undefined) doc.status = data.status;
    if (data.isActive !== undefined) doc.isActive = data.isActive;
    if (data.assignedStaff !== undefined) {
      doc.assignedStaff = data.assignedStaff.map((sid: string) => new mongoose.Types.ObjectId(sid));
    }

    await doc.save();

    const user = await UserModel.findById(userId);
    await AuditService.create({
      action: 'exhibition.update',
      performedBy: userId,
      performedByRole: user?.role || 'admin',
      targetType: 'exhibition',
      targetId: doc.exhibitionId.toString(),
      exhibitionId: doc.exhibitionId.toString(),
      details: {
        message: `Ride/Game '${doc.name}' updated.`,
        rideId: doc._id.toString(),
        fields: Object.keys(data),
      },
    });

    return doc.toJSON() as unknown as Ride;
  },

  async findById(id: string): Promise<Ride | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await RideModel.findById(id)
      .populate('assignedStaff', 'name staffId role email');
    return doc ? (doc.toJSON() as unknown as Ride) : null;
  },

  async list(params: { exhibitionId?: string; status?: string; search?: string }): Promise<Ride[]> {
    await connectToDatabase();

    const query: Record<string, any> = { isActive: true };

    if (params.exhibitionId) {
      query.exhibitionId = new mongoose.Types.ObjectId(params.exhibitionId);
    }
    if (params.status) {
      query.status = params.status;
    }
    if (params.search) {
      query.name = { $regex: escapeRegex(params.search), $options: 'i' };
    }

    const docs = await RideModel.find(query).populate('assignedStaff', 'name staffId');
    return docs.map((d: any) => d.toJSON() as unknown as Ride);
  },

  async createTickets(data: CreateRideTicketInput, userId: string): Promise<{ tickets: RideTicket[]; qrDataUrls: string[] }> {
    await connectToDatabase();

    // 1. Fetch user & ride context
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User performing transaction not found');
    }

    const ride = await RideModel.findById(data.rideId);
    if (!ride || !ride.isActive) {
      throw new Error('Ride/Game not found or deactivated');
    }

    const exhibition = await ExhibitionModel.findById(data.exhibitionId);
    if (!exhibition || exhibition.archive) {
      throw new Error('Exhibition not found or archived');
    }

    if (exhibition.status !== 'active') {
      throw new Error(`Exhibition is in '${exhibition.status}' state and is closed to sales.`);
    }

    if (ride.status === 'closed') {
      throw new Error(`Ride '${ride.name}' is currently closed for maintenance.`);
    }

    const price = ride.price; // in paise
    const quantity = data.quantity || 1;

    const secret = process.env.QR_HMAC_SECRET || 'dev-qr-secret-only-for-local-development-change-in-production';

    // Issue 1 Ride Ticket Bundle per transaction (1 QR code representing total quantity)
    const ticketNumber = generateTicketNumber('RID');
    const primaryTransactionId = generateTransactionId('RTX');
    const tempToken = `temp-ride-${Date.now()}`;
    const totalAmount = price * quantity;

    const tDoc = await RideTicketModel.create({
      ticketNumber,
      exhibitionId: exhibition._id,
      rideId: ride._id,
      ticketType: 'ride',
      price,
      qrPayload: tempToken,
      qrHash: tempToken,
      status: 'valid',
      quantity,
      usedCount: 0,
      remainingCount: quantity,
      scanCount: 0,
      soldBy: user._id,
      soldAt: new Date(),
      paymentMethod: data.paymentMethod,
      paymentStatus: 'paid',
      customerName: data.customerName?.trim() || undefined,
      customerPhone: data.customerPhone?.trim() || undefined,
      metadata: {
        transactionId: primaryTransactionId,
        upiTransactionRef: data.upiTransactionRef?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      },
    });

    // Cryptographically sign payload using the document's generated _id
    const qrPayload = createRideQrPayload(
      {
        ticketId: tDoc._id.toString(),
        exhibitionId: exhibition._id.toString(),
        rideId: ride._id.toString(),
        timestamp: Date.now(),
      },
      secret
    );
    const qrHash = sha256(qrPayload);

    tDoc.qrPayload = qrPayload;
    tDoc.qrHash = qrHash;
    await tDoc.save();

    const qrDataUrl = await generateQrDataUrl(qrPayload);
    const createdTicketJSON = {
      ...tDoc.toJSON(),
      quantity,
      usedCount: 0,
      remainingCount: quantity,
    };

    // 4. Create RideSale transaction
    await RideSaleModel.create({
      transactionId: primaryTransactionId,
      exhibitionId: exhibition._id,
      rideId: ride._id,
      tickets: [tDoc._id],
      ticketCount: quantity,
      totalAmount,
      paymentMethod: data.paymentMethod,
      upiTransactionRef: data.upiTransactionRef?.trim() || undefined,
      soldBy: user._id,
      soldAt: new Date(),
      customerName: data.customerName?.trim() || undefined,
      customerPhone: data.customerPhone?.trim() || undefined,
      cashReceived: data.cashReceived,
      changeGiven: data.changeGiven,
      notes: data.notes?.trim() || undefined,
    });

    // 5. Log audit trail
    await AuditService.create({
      action: 'ticket.create',
      performedBy: user._id.toString(),
      performedByRole: user.role,
      targetType: 'ticket',
      targetId: tDoc._id.toString(),
      exhibitionId: exhibition._id.toString(),
      details: {
        message: `Sold 1 ride ticket bundle (${quantity} entries) for '${ride.name}'.`,
        rideName: ride.name,
        ticketCount: quantity,
        totalAmount,
        transactionId: primaryTransactionId,
      },
    });

    return {
      tickets: [createdTicketJSON as unknown as RideTicket],
      qrDataUrls: [qrDataUrl],
    };
  },

  async validateTicket(data: ValidateRideTicketInput, staffUserId: string): Promise<RideTicketValidationResult> {
    await connectToDatabase();

    const secret = process.env.QR_HMAC_SECRET || 'dev-qr-secret-only-for-local-development-change-in-production';
    const qrPayload = data.qrPayload.trim();

    const staffUser = await UserModel.findById(staffUserId);
    if (!staffUser) {
      throw new Error('Validating staff member not found.');
    }

    const ride = await RideModel.findById(data.rideId);
    if (!ride) {
      throw new Error('Validating ride not found.');
    }

    // Scoping check: verify if the scanning staff is assigned to this ride (admins bypass)
    if (staffUser.role !== 'admin' && !ride.assignedStaff.some((sid: any) => sid.toString() === staffUserId)) {
      throw new Error('Access Denied: You are not assigned to scan tickets for this ride.');
    }

    const exhibitionId = data.exhibitionId;

    // ── Duplicate Scan Suppression (2-second window) ──
    const cooldownWindow = new Date(Date.now() - 2000);
    const existingRecentScan = await RideScanModel.findOne({
      qrPayloadRaw: qrPayload,
      rideId: ride._id,
      scannedAt: { $gte: cooldownWindow },
    }).sort({ scannedAt: -1 });

    if (existingRecentScan) {
      let ticketObj: RideTicket | undefined = undefined;
      const parsed = parseRideQrPayload(qrPayload, secret);
      if (parsed && mongoose.Types.ObjectId.isValid(parsed.ticketId)) {
        const ticketDoc = await RideTicketModel.findById(parsed.ticketId);
        if (ticketDoc) {
          ticketObj = ticketDoc.toJSON() as unknown as RideTicket;
        }
      }

      const isAdmitted = existingRecentScan.result === 'admitted';
      let message = 'Scan ignored (duplicate scan within cooldown).';
      if (existingRecentScan.result === 'admitted') message = 'Access Granted. Enjoy the ride!';
      else if (existingRecentScan.result === 'rejected_used') message = 'Duplicate ticket: Already used.';
      else if (existingRecentScan.reason) message = existingRecentScan.reason;

      return {
        valid: isAdmitted,
        result: existingRecentScan.result,
        ticket: ticketObj,
        ride: ride.toJSON() as unknown as Ride,
        message,
      };
    }

    // 1. Verify QR Payload Cryptographic Signature
    const parsedPayload = parseRideQrPayload(qrPayload, secret);

    if (!parsedPayload) {
      // Signature verification failure -> Suspected forgery
      await RideScanModel.create({
        rideId: ride._id,
        exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
        scannedBy: staffUser._id,
        scannedAt: new Date(),
        result: 'rejected_unknown',
        qrPayloadRaw: qrPayload,
        reason: 'HMAC signature verification failed. Forgery suspected.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_unknown',
        ride: ride.toJSON() as unknown as Ride,
        message: 'Invalid ticket payload. Decryption or signature check failed.',
      };
    }

    const { ticketId, rideId: payloadRideId, exhibitionId: payloadExhibitionId } = parsedPayload;

    // 2. Fetch the RideTicket Record
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      await RideScanModel.create({
        rideId: ride._id,
        exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
        scannedBy: staffUser._id,
        scannedAt: new Date(),
        result: 'rejected_invalid',
        qrPayloadRaw: qrPayload,
        reason: 'Invalid ticket ID format in QR.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_invalid',
        ride: ride.toJSON() as unknown as Ride,
        message: 'Ticket verification failed: Invalid ticket reference.',
      };
    }

    const ticket = await RideTicketModel.findById(ticketId);
    if (!ticket) {
      await RideScanModel.create({
        rideId: ride._id,
        exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
        scannedBy: staffUser._id,
        scannedAt: new Date(),
        result: 'rejected_invalid',
        qrPayloadRaw: qrPayload,
        reason: 'Ride ticket record not found in database.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_invalid',
        ride: ride.toJSON() as unknown as Ride,
        message: 'Ticket not found in systems database.',
      };
    }

    // 3. Verify Scopes (Wrong Ride or Wrong Exhibition)
    if (payloadExhibitionId !== exhibitionId || ticket.exhibitionId.toString() !== exhibitionId) {
      await RideScanModel.create({
        ticketId: ticket._id,
        rideId: ride._id,
        exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
        scannedBy: staffUser._id,
        scannedAt: new Date(),
        result: 'rejected_wrong_ride', // Treat as scoping issue
        qrPayloadRaw: qrPayload,
        reason: `Wrong Exhibition. Ticket exhibition: ${ticket.exhibitionId}. Scanner exhibition: ${exhibitionId}`,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_wrong_ride',
        ticket: ticket.toJSON() as unknown as RideTicket,
        ride: ride.toJSON() as unknown as Ride,
        message: 'Ticket belongs to a different exhibition.',
      };
    }

    if (payloadRideId !== ride._id.toString() || ticket.rideId.toString() !== ride._id.toString()) {
      const ticketRide = await RideModel.findById(ticket.rideId);
      const ticketRideName = ticketRide ? ticketRide.name : 'Another Ride';

      await RideScanModel.create({
        ticketId: ticket._id,
        rideId: ride._id,
        exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
        scannedBy: staffUser._id,
        scannedAt: new Date(),
        result: 'rejected_wrong_ride',
        qrPayloadRaw: qrPayload,
        reason: `Wrong Ride. Ticket is for: ${ticketRideName} (${ticket.rideId}). Scanner is for: ${ride.name} (${ride._id})`,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_wrong_ride',
        ticket: ticket.toJSON() as unknown as RideTicket,
        ride: ride.toJSON() as unknown as Ride,
        message: `Wrong Ride! This ticket is only valid for '${ticketRideName}', not '${ride.name}'.`,
      };
    }

    // 4. Verify Ride Status (if ride is closed, reject ticket entry)
    if (ride.status === 'closed') {
      await RideScanModel.create({
        ticketId: ticket._id,
        rideId: ride._id,
        exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
        scannedBy: staffUser._id,
        scannedAt: new Date(),
        result: 'rejected_closed',
        qrPayloadRaw: qrPayload,
        reason: `Ride '${ride.name}' is closed.`,
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_closed',
        ticket: ticket.toJSON() as unknown as RideTicket,
        ride: ride.toJSON() as unknown as Ride,
        message: `Ride is currently CLOSED. Access denied.`,
      };
    }

    // 5. Verify Ticket Status (Cancelled or Used)
    if (ticket.status === 'cancelled') {
      await RideScanModel.create({
        ticketId: ticket._id,
        rideId: ride._id,
        exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
        scannedBy: staffUser._id,
        scannedAt: new Date(),
        result: 'rejected_invalid',
        qrPayloadRaw: qrPayload,
        reason: 'Ride ticket is cancelled.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_invalid',
        ticket: ticket.toJSON() as unknown as RideTicket,
        ride: ride.toJSON() as unknown as Ride,
        message: 'Ticket has been cancelled or voided. Access denied.',
      };
    }

    const totalQty = ticket.quantity || 1;
    const prevUsed = ticket.usedCount || 0;
    const prevRemaining = ticket.remainingCount ?? (totalQty - prevUsed);

    if (ticket.status === 'used' || prevRemaining <= 0) {
      await RideScanModel.create({
        ticketId: ticket._id,
        rideId: ride._id,
        exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
        scannedBy: staffUser._id,
        scannedAt: new Date(),
        result: 'rejected_used',
        qrPayloadRaw: qrPayload,
        reason: 'Ride ticket bundle already completed. All entries used.',
        gateId: data.gateId,
      });

      return {
        valid: false,
        result: 'rejected_used',
        ticket: ticket.toJSON() as unknown as RideTicket,
        ride: ride.toJSON() as unknown as Ride,
        message: `All ${totalQty} entries on this ride ticket bundle have already been used.`,
      };
    }

    // 6. Calculate admissions count for this scan
    const requestedAdmitCount = Math.max(1, (data as any).countToAdmit || 1);
    const countToAdmit = Math.min(requestedAdmitCount, prevRemaining);

    if (countToAdmit <= 0) {
      return {
        valid: false,
        result: 'rejected_used',
        ticket: ticket.toJSON() as unknown as RideTicket,
        ride: ride.toJSON() as unknown as Ride,
        message: `No remaining entries available on this ride ticket bundle.`,
      };
    }

    const newUsed = prevUsed + countToAdmit;
    const newRemaining = prevRemaining - countToAdmit;
    const nextStatus = newRemaining === 0 ? 'used' : 'partially_used';

    // ATOMIC MONGODB UPDATE WITH GUARD CONDITION
    const updatedTicket = await RideTicketModel.findOneAndUpdate(
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
          usedBy: staffUser._id,
        },
      },
      { new: true }
    );

    if (!updatedTicket) {
      return {
        valid: false,
        result: 'rejected_used',
        ticket: ticket.toJSON() as unknown as RideTicket,
        ride: ride.toJSON() as unknown as Ride,
        message: `Insufficient remaining entries on ride ticket bundle or concurrent scan detected. Please retry.`,
      };
    }

    await RideScanModel.create({
      ticketId: updatedTicket._id,
      rideId: ride._id,
      exhibitionId: new mongoose.Types.ObjectId(exhibitionId),
      scannedBy: staffUser._id,
      scannedAt: new Date(),
      result: 'admitted',
      qrPayloadRaw: qrPayload,
      reason: `Admitted ${countToAdmit} visitor(s) for '${ride.name}'. ${newRemaining} remaining.`,
      admittedCount: countToAdmit,
      previousUsedCount: prevUsed,
      newUsedCount: newUsed,
      previousRemainingCount: prevRemaining,
      newRemainingCount: newRemaining,
      gateId: data.gateId,
    });

    await AuditService.create({
      action: 'ticket.scan',
      performedBy: staffUserId,
      performedByRole: staffUser.role,
      targetType: 'ticket',
      targetId: updatedTicket._id.toString(),
      exhibitionId: exhibitionId,
      details: {
        message: `Validated ride ticket ${updatedTicket.ticketNumber} for ride '${ride.name}'. Admitted: ${countToAdmit}.`,
        ticketNumber: updatedTicket.ticketNumber,
        rideName: ride.name,
        admittedCount: countToAdmit,
        previousRemainingCount: prevRemaining,
        newRemainingCount: newRemaining,
        result: 'admitted',
      },
    });

    const formattedMessage =
      newRemaining === 0
        ? `Access Granted! All ${updatedTicket.quantity} visitor(s) admitted for '${ride.name}'. Enjoy!`
        : `Access Granted! Admitted ${countToAdmit} visitor(s). ${newRemaining} entry(s) remaining on bundle.`;

    return {
      valid: true,
      result: 'admitted',
      ticket: updatedTicket.toJSON() as unknown as RideTicket,
      ride: ride.toJSON() as unknown as Ride,
      message: formattedMessage,
    };
  },

  async listScans(params: PaginationParams & {
    rideId?: string;
    exhibitionId?: string;
    scannedBy?: string;
    result?: string;
  }): Promise<{ data: RideScan[]; pagination: PaginationMeta }> {
    await connectToDatabase();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (params.rideId) query.rideId = new mongoose.Types.ObjectId(params.rideId);
    if (params.exhibitionId) query.exhibitionId = new mongoose.Types.ObjectId(params.exhibitionId);
    if (params.scannedBy) query.scannedBy = new mongoose.Types.ObjectId(params.scannedBy);
    if (params.result) query.result = params.result;

    const total = await RideScanModel.countDocuments(query);
    const docs = await RideScanModel.find(query)
      .sort({ scannedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ticketId', 'ticketNumber customerName')
      .populate('rideId', 'name price')
      .populate('scannedBy', 'name staffId')
      .lean();

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map((d: any) => ({
        ...d,
        id: d._id.toString(),
        ticketId: d.ticketId ? { ...d.ticketId, id: d.ticketId._id?.toString() } : undefined,
        rideId: d.rideId ? { ...d.rideId, id: d.rideId._id?.toString() } : undefined,
        scannedBy: d.scannedBy ? { ...d.scannedBy, id: d.scannedBy._id?.toString() } : undefined,
      }) as unknown as RideScan),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  async listSales(params: PaginationParams & {
    rideId?: string;
    exhibitionId?: string;
    soldBy?: string;
  }): Promise<{ data: RideSale[]; pagination: PaginationMeta }> {
    await connectToDatabase();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (params.rideId) query.rideId = new mongoose.Types.ObjectId(params.rideId);
    if (params.exhibitionId) query.exhibitionId = new mongoose.Types.ObjectId(params.exhibitionId);
    if (params.soldBy) query.soldBy = new mongoose.Types.ObjectId(params.soldBy);

    const total = await RideSaleModel.countDocuments(query);
    const docs = await RideSaleModel.find(query)
      .sort({ soldAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('rideId', 'name price')
      .populate('exhibitionId', 'name venue')
      .populate('soldBy', 'name staffId')
      .populate('tickets', 'ticketNumber status')
      .lean();

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map((d: any) => ({
        ...d,
        id: d._id.toString(),
        rideId: d.rideId ? { ...d.rideId, id: d.rideId._id?.toString() } : undefined,
        exhibitionId: d.exhibitionId ? { ...d.exhibitionId, id: d.exhibitionId._id?.toString() } : undefined,
        soldBy: d.soldBy ? { ...d.soldBy, id: d.soldBy._id?.toString() } : undefined,
      }) as unknown as RideSale),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  async getStats(rideId: string, startDate?: string, endDate?: string): Promise<Record<string, any>> {
    await connectToDatabase();
    const rideObjectId = new mongoose.Types.ObjectId(rideId);

    const ride = await RideModel.findById(rideId).select('name price status').lean();
    if (!ride) throw new Error('Ride not found');

    const ticketQuery: Record<string, any> = { rideId: rideObjectId, status: { $ne: 'cancelled' } };
    const saleQuery: Record<string, any> = { rideId: rideObjectId, status: { $ne: 'cancelled' } };
    const scanQuery: Record<string, any> = { rideId: rideObjectId };

    if (startDate || endDate) {
      const dateFilter: Record<string, any> = {};
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        dateFilter.$gte = sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = eDate;
      }
      ticketQuery.createdAt = dateFilter;
      saleQuery.soldAt = dateFilter;
      scanQuery.scannedAt = dateFilter;
    }

    const ticketsSold = await RideTicketModel.countDocuments(ticketQuery);

    const revenueResult = await RideSaleModel.aggregate([
      { $match: saleQuery },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const totalScans = await RideScanModel.countDocuments(scanQuery);
    const admittedScans = await RideScanModel.find({ ...scanQuery, result: 'admitted' })
      .select('admittedCount')
      .lean();
    const admittedCount = admittedScans.reduce((sum, sc) => sum + (sc.admittedCount || 1), 0);
    const rejectedCount = totalScans - admittedScans.length;

    return {
      rideId,
      name: ride.name,
      price: ride.price,
      status: ride.status,
      ticketsSold,
      totalRevenue,
      totalScans,
      admittedCount,
      rejectedCount,
    };
  },

  async getStaffDashboardData(staffUserId: string): Promise<Record<string, any> | null> {
    await connectToDatabase();

    // Find ride assigned to this operator
    const ride = await RideModel.findOne({ assignedStaff: new mongoose.Types.ObjectId(staffUserId), isActive: true }).lean();
    if (!ride) return null;

    const rideObjectId = ride._id;

    // Today's boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayTicketsCount = await RideTicketModel.countDocuments({
      rideId: rideObjectId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'cancelled' },
    });

    const todayScans = await RideScanModel.find({
      rideId: rideObjectId,
      scannedAt: { $gte: startOfToday, $lte: endOfToday },
    })
      .select('result admittedCount')
      .lean();

    let validCount = 0;
    let invalidCount = 0;
    for (const scan of todayScans) {
      if (scan.result === 'admitted') {
        validCount += scan.admittedCount || 1;
      } else {
        invalidCount++;
      }
    }

    // Recent 10 scans
    const recentScansDocs = await RideScanModel.find({ rideId: rideObjectId })
      .sort({ scannedAt: -1, _id: -1 })
      .limit(10)
      .populate('scannedBy', 'name staffId')
      .populate('ticketId', 'ticketNumber customerName')
      .lean();

    const recentScans = recentScansDocs.map((s: any) => ({
      ...s,
      id: s._id.toString(),
      scannedBy: s.scannedBy ? { ...s.scannedBy, id: s.scannedBy._id?.toString() } : undefined,
      ticketId: s.ticketId ? { ...s.ticketId, id: s.ticketId._id?.toString() } : undefined,
    }));

    return {
      ride: { ...ride, id: ride._id.toString() } as unknown as Ride,
      todayTicketsCount,
      validCount,
      invalidCount,
      totalScansToday: todayScans.length,
      recentScans,
    };
  },
};
