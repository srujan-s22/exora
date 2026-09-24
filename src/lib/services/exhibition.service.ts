import mongoose from 'mongoose';
import { Exhibition as ExhibitionModel } from '@/lib/db/models/exhibition.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { TicketScan as TicketScanModel } from '@/lib/db/models/ticket-scan.model';
import { connectToDatabase } from '@/lib/db/connection';
import { AuditService } from '@/lib/services/audit.service';
import { NotificationService } from '@/lib/services/notification.service';
import { GeocodingService } from '@/lib/services/geocoding.service';
import { escapeRegex } from '@/lib/utils/sanitize';
import type { Exhibition, CreateExhibitionInput, UpdateExhibitionInput } from '@/types/exhibition.types';
import type { PaginationParams, PaginationMeta } from '@/types/api.types';

/**
 * Exhibition management service.
 * Implements CRUD operations, staff mapping synchronization, and metrics aggregation.
 */
export const ExhibitionService = {
  async create(data: CreateExhibitionInput, userId: string): Promise<Exhibition> {
    await connectToDatabase();

    // 1. Generate a unique slug
    let baseSlug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!baseSlug) baseSlug = 'exhibition';
    
    let slug = baseSlug;
    let counter = 1;
    while (await ExhibitionModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // 2. Resolve location coordinates if provided
    if (data.location) {
      if (data.location.placeId) {
        // Resolve placeId server-side
        const resolved = await GeocodingService.resolvePlaceId(data.location.placeId);
        if (resolved) {
          data.location.latitude = resolved.latitude;
          data.location.longitude = resolved.longitude;
        } else if (data.location.latitude != null && data.location.longitude != null) {
          // Validate client-provided coordinates from Google Places selection
          const lat = data.location.latitude;
          const lng = data.location.longitude;
          if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            data.location.latitude = null;
            data.location.longitude = null;
          }
        }
      } else if (data.location.latitude == null || data.location.longitude == null) {
        // Fallback text geocode only when placeId is not present and coordinates are missing
        const geo = await GeocodingService.geocode(data.location);
        if (geo) {
          data.location.latitude = geo.latitude;
          data.location.longitude = geo.longitude;
        } else {
          data.location.latitude = null;
          data.location.longitude = null;
        }
      }
    }

    // 3. Create the Exhibition document
    const venue = data.venue || data.location?.venueName || '';
    const address = data.address || data.location?.address || '';

    const doc = await ExhibitionModel.create({
      ...data,
      venue,
      address,
      slug,
      status: 'draft', // initial state is draft
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    // 3. Bidirectional staff mapping (update User documents)
    if (data.assignedStaffIds && data.assignedStaffIds.length > 0) {
      await UserModel.updateMany(
        { _id: { $in: data.assignedStaffIds } },
        { $addToSet: { assignedExhibitions: doc._id } }
      );
    }

    // 4. Log create audit entry
    await AuditService.create({
      action: 'exhibition.create',
      performedBy: userId,
      performedByRole: 'admin',
      targetType: 'exhibition',
      targetId: doc._id.toString(),
      details: { name: doc.name, slug: doc.slug, status: doc.status },
    });

    return doc.toJSON() as unknown as Exhibition;
  },

  /**
   * Rechecks and synchronizes status of all non-archived exhibitions in the database based on current time.
   * Automatically sets expired exhibitions to 'completed' and reactivates extended exhibitions to 'active'.
   */
  async syncExhibitionStatuses(): Promise<void> {
    try {
      await connectToDatabase();
      const now = new Date();

      // 1. Mark expired exhibitions as 'completed'
      await ExhibitionModel.updateMany(
        {
          status: { $nin: ['completed', 'closed', 'archived', 'paused'] },
          endDate: { $lt: now },
        },
        {
          $set: { status: 'completed' },
        }
      );

      // 2. Reactivate exhibitions whose date range is now valid (e.g. extended end date)
      await ExhibitionModel.updateMany(
        {
          status: 'completed',
          archive: { $ne: true },
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
        {
          $set: { status: 'active' },
          $unset: { manualEndReason: "" }
        }
      );

      // 3. Activate upcoming exhibitions whose start date has arrived
      await ExhibitionModel.updateMany(
        {
          status: 'upcoming',
          archive: { $ne: true },
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
        {
          $set: { status: 'active' },
        }
      );
    } catch (err) {
      console.error('Failed to sync exhibition statuses:', err);
    }
  },

  /**
   * Automatically updates any active/upcoming exhibitions in the database whose end date has passed to 'completed'.
   */
  async autoCompleteExpiredExhibitions(): Promise<void> {
    await this.syncExhibitionStatuses();
  },

  async findById(id: string): Promise<Exhibition | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    await this.syncExhibitionStatuses();
    const doc = await ExhibitionModel.findById(id).populate('assignedStaffIds', 'name staffId role');
    if (!doc) return null;
    const effectiveStatus = this.getEffectiveStatus(doc);
    if (doc.status !== effectiveStatus && doc.status !== 'archived' && doc.status !== 'closed' && doc.status !== 'paused') {
      doc.status = effectiveStatus as any;
    }
    return { ...doc.toJSON(), status: effectiveStatus } as unknown as Exhibition;
  },

  async findBySlug(slug: string): Promise<Exhibition | null> {
    await connectToDatabase();
    await this.syncExhibitionStatuses();
    const doc = await ExhibitionModel.findOne({ slug: slug.toLowerCase() });
    if (!doc) return null;
    const effectiveStatus = this.getEffectiveStatus(doc);
    return { ...doc.toJSON(), status: effectiveStatus } as unknown as Exhibition;
  },

  async update(id: string, data: UpdateExhibitionInput, userId: string): Promise<Exhibition | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await ExhibitionModel.findById(id);
    if (!doc) return null;

    const prevStatus = doc.status;
    const prevStaffIds = doc.assignedStaffIds.map((sid: any) => sid.toString());

    // 1. Handle slug regeneration if name is modified
    if (data.name !== undefined && data.name !== doc.name) {
      doc.name = data.name;
      let baseSlug = data.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      if (!baseSlug) baseSlug = 'exhibition';
      
      let slug = baseSlug;
      let counter = 1;
      while (await ExhibitionModel.findOne({ slug, _id: { $ne: doc._id } })) {
        slug = `${baseSlug}-${counter++}`;
      }
      doc.slug = slug;
    }

    // 2. Map standard properties
    if (data.description !== undefined) doc.description = data.description;
    if (data.category !== undefined) doc.category = data.category;
    if (data.venue !== undefined) doc.venue = data.venue;
    if (data.address !== undefined) doc.address = data.address;
    if (data.location !== undefined) {
      if (data.location === null) {
        doc.location = null;
      } else {
        const prevLocation = doc.location;
        const locationChanged = GeocodingService.hasLocationChanged(prevLocation, data.location);

        if (locationChanged) {
          if (data.location.placeId) {
            // New Google Place selected! Resolve server-side
            const resolved = await GeocodingService.resolvePlaceId(data.location.placeId);
            if (resolved) {
              data.location.latitude = resolved.latitude;
              data.location.longitude = resolved.longitude;
            } else if (data.location.latitude != null && data.location.longitude != null) {
              // Validate client-provided coordinates from Google Places selection
              const lat = data.location.latitude;
              const lng = data.location.longitude;
              if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                data.location.latitude = null;
                data.location.longitude = null;
              }
            } else {
              data.location.latitude = null;
              data.location.longitude = null;
            }
          } else {
            // Text address changed! Invalidate old coordinates immediately to prevent stale coordinates
            data.location.latitude = null;
            data.location.longitude = null;

            // Attempt re-geocoding for the new address
            const geo = await GeocodingService.geocode(data.location);
            if (geo) {
              data.location.latitude = geo.latitude;
              data.location.longitude = geo.longitude;
            }
          }
        } else {
          // Location did not change
          if (prevLocation?.latitude != null && prevLocation?.longitude != null) {
            // Keep existing coordinates without making an unnecessary external API call
            data.location.latitude = prevLocation.latitude;
            data.location.longitude = prevLocation.longitude;
            if (prevLocation.placeId && !data.location.placeId) {
              data.location.placeId = prevLocation.placeId;
            }
          } else if (data.location.placeId) {
            const resolved = await GeocodingService.resolvePlaceId(data.location.placeId);
            if (resolved) {
              data.location.latitude = resolved.latitude;
              data.location.longitude = resolved.longitude;
            }
          } else {
            // Coordinates were missing on this existing location: geocode it
            const geo = await GeocodingService.geocode(data.location);
            if (geo) {
              data.location.latitude = geo.latitude;
              data.location.longitude = geo.longitude;
            } else {
              data.location.latitude = null;
              data.location.longitude = null;
            }
          }
        }

        doc.location = data.location;
        if (data.location?.venueName && data.venue === undefined) {
          doc.venue = data.location.venueName;
        }
        if (data.location?.address && data.address === undefined) {
          doc.address = data.location.address;
        }
      }
    }
    if (data.startDate !== undefined) doc.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) doc.endDate = new Date(data.endDate);
    if (data.ticketTypes !== undefined) doc.ticketTypes = data.ticketTypes as any;
    if (data.status !== undefined) {
      doc.status = data.status;
    } else if (data.endDate !== undefined || data.startDate !== undefined) {
      const nowMs = Date.now();
      const startMs = new Date(doc.startDate).getTime();
      const endMs = new Date(doc.endDate).getTime();
      if ((doc.status === 'completed' || doc.status === 'upcoming') && nowMs >= startMs && nowMs <= endMs) {
        doc.status = 'active';
        (doc as any).manualEndReason = undefined;
      }
    }
    if (data.settings !== undefined) doc.settings = { ...doc.settings, ...data.settings };
    if (data.entryFee !== undefined) doc.entryFee = data.entryFee;
    if (data.capacity !== undefined) doc.capacity = data.capacity;
    if (data.notes !== undefined) doc.notes = data.notes;
    if (data.images !== undefined) doc.images = data.images;
    if (data.active !== undefined) doc.active = data.active;
    if (data.archive !== undefined) doc.archive = data.archive;

    if (data.assignedGateIds !== undefined) doc.assignedGateIds = data.assignedGateIds;
    if (data.assignedStaffIds !== undefined) {
      doc.assignedStaffIds = data.assignedStaffIds.map((sid: string) => new mongoose.Types.ObjectId(sid)) as any;
    }

    await doc.save();

    // 3. Bidirectional staff synchronization (diff matching)
    if (data.assignedStaffIds !== undefined) {
      const newStaffIds = data.assignedStaffIds;
      const addedStaffIds = newStaffIds.filter((sid: string) => !prevStaffIds.includes(sid));
      const removedStaffIds = prevStaffIds.filter((sid: string) => !newStaffIds.includes(sid));

      if (addedStaffIds.length > 0) {
        await UserModel.updateMany(
          { _id: { $in: addedStaffIds } },
          { $addToSet: { assignedExhibitions: doc._id } }
        );
      }

      if (removedStaffIds.length > 0) {
        await UserModel.updateMany(
          { _id: { $in: removedStaffIds } },
          { $pull: { assignedExhibitions: doc._id } }
        );
      }
    }

    // 4. Log status change audit
    if (data.status !== undefined && data.status !== prevStatus) {
      await AuditService.create({
        action: 'exhibition.status_change',
        performedBy: userId,
        performedByRole: 'admin',
        targetType: 'exhibition',
        targetId: doc._id.toString(),
        details: { prevStatus, newStatus: doc.status, name: doc.name },
      });
    }

    // 5. Log update audit
    await AuditService.create({
      action: 'exhibition.update',
      performedBy: userId,
      performedByRole: 'admin',
      targetType: 'exhibition',
      targetId: doc._id.toString(),
      details: { name: doc.name, fields: Object.keys(data) },
    });

    await doc.populate('assignedStaffIds', 'name staffId role');
    return { ...doc.toJSON(), status: this.getEffectiveStatus(doc) } as unknown as Exhibition;
  },

  async list(params: PaginationParams & { status?: string; search?: string; category?: string; includeArchived?: boolean }, user?: any): Promise<{ data: Exhibition[]; pagination: PaginationMeta }> {
    await connectToDatabase();
    await this.syncExhibitionStatuses();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const skip = (page - 1) * limit;

    let query: Record<string, any> = {};

    // Filter archived collections
    if (!params.includeArchived) {
      query.archive = { $ne: true };
      query.status = { $ne: 'archived' };
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.category) {
      query.category = params.category;
    }

    if (params.search) {
      query.name = { $regex: escapeRegex(params.search), $options: 'i' };
    }

    // Apply exhibition scope query filter
    const { applyExhibitionScopeQuery } = require('@/lib/utils/exhibition-scope');
    query = applyExhibitionScopeQuery(user, query, '_id');

    const total = await ExhibitionModel.countDocuments(query);
    const docs = await ExhibitionModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const data = await Promise.all(
      docs.map(async (doc: any) => {
        const docIdStr = doc._id.toString();
        const stats = await ExhibitionService.getStats(docIdStr);
        const effectiveStatus = this.getEffectiveStatus(doc);
        return {
          ...doc,
          id: docIdStr,
          status: effectiveStatus,
          ticketCount: stats.ticketsSold,
          revenue: stats.totalRevenue,
        } as unknown as Exhibition;
      })
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  },

  /**
   * Evaluates the effective lifecycle status of an exhibition dynamically based on current server time.
   * Auto-syncs status to 'completed' in DB if the exhibition end time has passed.
   */
  getEffectiveStatus(doc: any): string {
    if (!doc) return 'closed';
    if (doc.status === 'archived' || doc.status === 'paused' || doc.status === 'draft') {
      return doc.status;
    }
    const now = Date.now();
    const startDateMs = new Date(doc.startDate).getTime();
    const endDateMs = new Date(doc.endDate).getTime();

    if (now > endDateMs) {
      if (doc.status !== 'completed' && doc.status !== 'closed') {
        // Auto-complete in background if needed
        ExhibitionModel.updateOne(
          { _id: doc._id || doc.id, status: { $nin: ['completed', 'closed', 'archived'] } },
          { $set: { status: 'completed', completedAt: new Date(endDateMs) } }
        ).catch((err: any) => console.error('Failed to auto-sync exhibition completion:', err));
      }
      return 'completed';
    }

    if (now < startDateMs) {
      return 'upcoming';
    }

    return 'active';
  },

  /**
   * Checks whether an exhibition is currently operational for ticket sales and scans.
   */
  isOperational(doc: any): { operational: boolean; reason?: string; effectiveStatus: string } {
    if (!doc) {
      return { operational: false, reason: 'Exhibition not found', effectiveStatus: 'closed' };
    }
    if (doc.active === false || doc.archive === true) {
      return { operational: false, reason: 'Exhibition is inactive or archived', effectiveStatus: 'archived' };
    }

    const effectiveStatus = this.getEffectiveStatus(doc);

    if (doc.status === 'paused') {
      return {
        operational: false,
        reason: doc.manualPauseReason
          ? `Exhibition is manually paused: ${doc.manualPauseReason}`
          : 'Exhibition is currently paused by admin.',
        effectiveStatus: 'paused',
      };
    }

    if (doc.status === 'draft') {
      return { operational: false, reason: 'Exhibition is in draft state.', effectiveStatus: 'draft' };
    }

    if (effectiveStatus === 'upcoming') {
      return {
        operational: false,
        reason: `Exhibition has not started yet (scheduled for ${new Date(doc.startDate).toLocaleString('en-IN')}).`,
        effectiveStatus: 'upcoming',
      };
    }

    if (effectiveStatus === 'completed') {
      return {
        operational: false,
        reason: `Exhibition has completed (ended at ${new Date(doc.endDate).toLocaleString('en-IN')}).`,
        effectiveStatus: 'completed',
      };
    }

    if (effectiveStatus === 'active') {
      return { operational: true, effectiveStatus: 'active' };
    }

    return { operational: false, reason: 'Exhibition is not operational.', effectiveStatus };
  },

  /**
   * Manually pause an operational exhibition (Admin only).
   */
  async pauseExhibition(id: string, userId: string, reason: string): Promise<Exhibition | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await ExhibitionModel.findById(id);
    if (!doc) return null;

    const prevStatus = doc.status;
    const now = new Date();

    doc.status = 'paused';
    doc.pausedAt = now;
    doc.manualPauseReason = reason.trim();
    doc.lastStatusChangeAt = now;
    doc.lastStatusChangeBy = new mongoose.Types.ObjectId(userId);
    doc.managedBy = new mongoose.Types.ObjectId(userId);
    await doc.save();

    await AuditService.create({
      action: 'exhibition.pause' as any,
      performedBy: userId,
      performedByRole: 'admin',
      targetType: 'exhibition',
      targetId: doc._id.toString(),
      details: { prevStatus, newStatus: 'paused', reason: reason.trim(), name: doc.name },
    });

    try {
      const adminUsers = await UserModel.find({ role: { $in: ['super_admin', 'admin'] }, isActive: true }).select('_id');
      if (adminUsers.length > 0) {
        await NotificationService.sendBroadcastNotifications({
          senderId: userId,
          targetType: 'users',
          recipientUserIds: adminUsers.map((u) => u._id.toString()),
          title: 'Exhibition Paused',
          message: `Exhibition '${doc.name}' was manually paused: ${reason.trim()}`,
          type: 'alert',
        });
      }
    } catch (nErr) {
      console.error('Failed to send pause notification:', nErr);
    }

    return doc.toJSON() as unknown as Exhibition;
  },

  /**
   * Resume a paused exhibition (Admin only).
   */
  async resumeExhibition(id: string, userId: string, reason?: string): Promise<Exhibition | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await ExhibitionModel.findById(id);
    if (!doc) return null;

    const prevStatus = doc.status;
    const now = new Date();
    const effective = this.getEffectiveStatus(doc);
    const newStatus = effective === 'completed' ? 'completed' : 'active';

    doc.status = newStatus;
    doc.resumedAt = now;
    doc.lastStatusChangeAt = now;
    doc.lastStatusChangeBy = new mongoose.Types.ObjectId(userId);
    doc.managedBy = new mongoose.Types.ObjectId(userId);
    await doc.save();

    await AuditService.create({
      action: 'exhibition.resume' as any,
      performedBy: userId,
      performedByRole: 'admin',
      targetType: 'exhibition',
      targetId: doc._id.toString(),
      details: { prevStatus, newStatus, reason: reason?.trim(), name: doc.name },
    });

    return doc.toJSON() as unknown as Exhibition;
  },

  /**
   * Manually end an exhibition (Admin only).
   */
  async endExhibition(id: string, userId: string, reason: string): Promise<Exhibition | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await ExhibitionModel.findById(id);
    if (!doc) return null;

    const prevStatus = doc.status;
    const now = new Date();

    doc.status = 'completed';
    doc.completedAt = now;
    doc.manualEndReason = reason.trim();
    doc.lastStatusChangeAt = now;
    doc.lastStatusChangeBy = new mongoose.Types.ObjectId(userId);
    doc.managedBy = new mongoose.Types.ObjectId(userId);
    await doc.save();

    await AuditService.create({
      action: 'exhibition.end' as any,
      performedBy: userId,
      performedByRole: 'admin',
      targetType: 'exhibition',
      targetId: doc._id.toString(),
      details: { prevStatus, newStatus: 'completed', reason: reason.trim(), name: doc.name },
    });

    try {
      const adminUsers = await UserModel.find({ role: { $in: ['super_admin', 'admin'] }, isActive: true }).select('_id');
      if (adminUsers.length > 0) {
        await NotificationService.sendBroadcastNotifications({
          senderId: userId,
          targetType: 'users',
          recipientUserIds: adminUsers.map((u) => u._id.toString()),
          title: 'Exhibition Ended',
          message: `Exhibition '${doc.name}' was ended: ${reason.trim()}`,
          type: 'info',
        });
      }
    } catch (nErr) {
      console.error('Failed to send end notification:', nErr);
    }

    return doc.toJSON() as unknown as Exhibition;
  },

  /**
   * Extend exhibition end date (Admin only).
   */
  async extendExhibition(id: string, userId: string, newEndDate: Date, reason: string): Promise<Exhibition | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await ExhibitionModel.findById(id);
    if (!doc) return null;

    const prevEndDate = doc.endDate;
    const prevStatus = doc.status;
    const now = new Date();

    if (newEndDate.getTime() <= new Date(doc.startDate).getTime()) {
      throw new Error('New end date must be after start date');
    }

    doc.endDate = newEndDate;
    doc.manualExtendReason = reason.trim();
    doc.lastStatusChangeAt = now;
    doc.lastStatusChangeBy = new mongoose.Types.ObjectId(userId);
    doc.managedBy = new mongoose.Types.ObjectId(userId);

    // If exhibition was completed but extended into the future, reactivate
    if (now.getTime() < newEndDate.getTime() && doc.status === 'completed') {
      doc.status = 'active';
    }

    await doc.save();

    await AuditService.create({
      action: 'exhibition.extend' as any,
      performedBy: userId,
      performedByRole: 'admin',
      targetType: 'exhibition',
      targetId: doc._id.toString(),
      details: {
        prevEndDate,
        newEndDate,
        reason: reason.trim(),
        prevStatus,
        newStatus: doc.status,
        name: doc.name,
      },
    });

    return doc.toJSON() as unknown as Exhibition;
  },

  async getActiveExhibitions(): Promise<Exhibition[]> {
    await connectToDatabase();
    const now = new Date();
    const docs = await ExhibitionModel.find({
      status: 'active',
      archive: { $ne: true },
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ name: 1, _id: 1 })
      .lean();
    return docs.map((d: any) => ({ ...d, id: d._id.toString() } as unknown as Exhibition));
  },

  async getActiveExhibitionsForStaff(userId: string, userRole: string): Promise<Exhibition[]> {
    await connectToDatabase();
    const now = new Date();
    const query: Record<string, any> = {
      status: 'active',
      archive: { $ne: true },
      startDate: { $lte: now },
      endDate: { $gte: now },
    };
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      const user = await UserModel.findById(userId).select('assignedExhibitions').lean();
      const assignedFromUser = (user?.assignedExhibitions || [])
        .map((e: any) => (typeof e === 'object' && e !== null ? (e._id ? e._id.toString() : e.id?.toString() || String(e)) : String(e)))
        .filter((id: string) => id && mongoose.Types.ObjectId.isValid(id));

      const userObjId = new mongoose.Types.ObjectId(userId);
      const orConditions: any[] = [{ assignedStaffIds: userObjId }];

      if (assignedFromUser.length > 0) {
        orConditions.push({ _id: { $in: assignedFromUser.map((id: string) => new mongoose.Types.ObjectId(id)) } });
      }

      query.$or = orConditions;
    }
    const docs = await ExhibitionModel.find(query)
      .sort({ name: 1, _id: 1 })
      .lean();
    return docs.map((d: any) => ({ ...d, id: d._id.toString() } as unknown as Exhibition));
  },

  async getStats(id: string): Promise<Record<string, any>> {
    await connectToDatabase();
    const exhibitionObjectId = new mongoose.Types.ObjectId(id);

    // 1. Total tickets sold count
    const ticketsSold = await TicketModel.countDocuments({ exhibitionId: exhibitionObjectId, status: { $ne: 'cancelled' } });

    // 2. Total revenue sum
    const sales = await SaleModel.aggregate([
      { $match: { exhibitionId: exhibitionObjectId, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = sales.length > 0 ? sales[0].total : 0;

    // 3. Ticket validation scans processed count
    const totalScans = await TicketScanModel.countDocuments({ exhibitionId: exhibitionObjectId });

    // 4. Admitted visitor count with selective field & lean query
    const admittedScans = await TicketScanModel.find({
      exhibitionId: exhibitionObjectId,
      result: 'admitted',
    })
      .select('admittedCount')
      .lean();
    const admittedCount = admittedScans.reduce((sum, sc) => sum + (sc.admittedCount || 1), 0);

    // 5. Compute capacity utilization
    const exh = await ExhibitionModel.findById(id).select('capacity').lean();
    const capacity = exh?.capacity || 0;
    const utilization = capacity > 0 ? (admittedCount / capacity) * 100 : 0;

    return {
      ticketsSold,
      totalRevenue,
      totalScans,
      admittedCount,
      utilization: Math.round(utilization * 10) / 10,
    };
  },
};
