import mongoose from 'mongoose';
import { Exhibition as ExhibitionModel } from '@/lib/db/models/exhibition.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { TicketScan as TicketScanModel } from '@/lib/db/models/ticket-scan.model';
import { connectToDatabase } from '@/lib/db/connection';
import { AuditService } from '@/lib/services/audit.service';
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

    // 2. Create the Exhibition document
    const doc = await ExhibitionModel.create({
      ...data,
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

  async findById(id: string): Promise<Exhibition | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await ExhibitionModel.findById(id).populate('assignedStaffIds', 'name staffId role');
    return doc ? (doc.toJSON() as unknown as Exhibition) : null;
  },

  async findBySlug(slug: string): Promise<Exhibition | null> {
    await connectToDatabase();
    const doc = await ExhibitionModel.findOne({ slug: slug.toLowerCase() });
    return doc ? (doc.toJSON() as unknown as Exhibition) : null;
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
    if (data.startDate !== undefined) doc.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) doc.endDate = new Date(data.endDate);
    if (data.ticketTypes !== undefined) doc.ticketTypes = data.ticketTypes as any;
    if (data.status !== undefined) doc.status = data.status;
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
        details: { prevStatus, newStatus: data.status, name: doc.name },
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
    return doc.toJSON() as unknown as Exhibition;
  },

  async list(params: PaginationParams & { status?: string; search?: string; category?: string; includeArchived?: boolean }): Promise<{ data: Exhibition[]; pagination: PaginationMeta }> {
    await connectToDatabase();

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

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

    const total = await ExhibitionModel.countDocuments(query);
    const docs = await ExhibitionModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const data = await Promise.all(
      docs.map(async (doc) => {
        const stats = await ExhibitionService.getStats(doc._id.toString());
        return {
          ...(doc.toJSON() as unknown as Exhibition),
          ticketCount: stats.ticketsSold,
          revenue: stats.totalRevenue,
        };
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

  async getActiveExhibitions(): Promise<Exhibition[]> {
    await connectToDatabase();
    const docs = await ExhibitionModel.find({ status: 'active', archive: { $ne: true } }).sort({ name: 1 });
    return docs.map((d) => d.toJSON() as unknown as Exhibition);
  },

  async getActiveExhibitionsForStaff(userId: string, userRole: string): Promise<Exhibition[]> {
    await connectToDatabase();
    const query: Record<string, any> = { status: 'active', archive: { $ne: true } };
    if (userRole !== 'admin') {
      query.assignedStaffIds = new mongoose.Types.ObjectId(userId);
    }
    const docs = await ExhibitionModel.find(query).sort({ name: 1 });
    return docs.map((d) => d.toJSON() as unknown as Exhibition);
  },

  async getStats(id: string): Promise<Record<string, any>> {
    await connectToDatabase();
    const exhibitionObjectId = new mongoose.Types.ObjectId(id);

    // 1. Total tickets sold count
    const ticketsSold = await TicketModel.countDocuments({ exhibitionId: exhibitionObjectId });

    // 2. Total revenue sum
    const sales = await SaleModel.aggregate([
      { $match: { exhibitionId: exhibitionObjectId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = sales.length > 0 ? sales[0].total : 0;

    // 3. Ticket validation scans processed count
    const totalScans = await TicketScanModel.countDocuments({ exhibitionId: exhibitionObjectId });

    // 4. Admitted visitor count
    const admittedCount = await TicketScanModel.countDocuments({
      exhibitionId: exhibitionObjectId,
      result: 'admitted',
    });

    // 5. Compute capacity utilization
    const exh = await ExhibitionModel.findById(id);
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
