import type { Sale, SaleStats } from '@/types/sale.types';
import type { PaginationParams, PaginationMeta } from '@/types/api.types';
import mongoose from 'mongoose';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { connectToDatabase } from '@/lib/db/connection';

/**
 * Sales service.
 * Handles sales recording and analytics.
 */
export const SaleService = {
  async list(
    params: PaginationParams & {
      exhibitionId?: string;
      soldBy?: string;
      paymentMethod?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ data: Sale[]; pagination: PaginationMeta }> {
    await connectToDatabase();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (params.exhibitionId) {
      query.exhibitionId = new mongoose.Types.ObjectId(params.exhibitionId);
    }
    if (params.soldBy) {
      query.soldBy = new mongoose.Types.ObjectId(params.soldBy);
    }
    if (params.paymentMethod) {
      query.paymentMethod = params.paymentMethod;
    }
    if (params.startDate || params.endDate) {
      query.soldAt = {};
      if (params.startDate) {
        query.soldAt.$gte = params.startDate;
      }
      if (params.endDate) {
        query.soldAt.$lte = params.endDate;
      }
    }

    const total = await SaleModel.countDocuments(query);
    const docs = await SaleModel.find(query)
      .sort({ soldAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('exhibitionId', 'name venue')
      .populate('soldBy', 'name staffId')
      .lean();

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map((d: any) => ({
        ...d,
        id: d._id.toString(),
        exhibitionId: d.exhibitionId ? { ...d.exhibitionId, id: d.exhibitionId._id?.toString() } : undefined,
        soldBy: d.soldBy ? { ...d.soldBy, id: d.soldBy._id?.toString() } : undefined,
      }) as unknown as Sale),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  async getStats(exhibitionId?: string, dateRange?: { start: Date; end: Date }): Promise<SaleStats> {
    await connectToDatabase();

    const match: Record<string, any> = { status: { $ne: 'cancelled' } };
    if (exhibitionId) {
      match.exhibitionId = new mongoose.Types.ObjectId(exhibitionId);
    }
    if (dateRange) {
      match.soldAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const sales = await SaleModel.find(match)
      .select('totalAmount ticketCount paymentMethod')
      .lean();

    let totalRevenue = 0;
    let totalTickets = 0;
    let cashRevenue = 0;
    let upiRevenue = 0;
    let cashTickets = 0;
    let upiTickets = 0;

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalTickets += sale.ticketCount;

      if (sale.paymentMethod === 'cash') {
        cashRevenue += sale.totalAmount;
        cashTickets += sale.ticketCount;
      } else if (sale.paymentMethod === 'upi') {
        upiRevenue += sale.totalAmount;
        upiTickets += sale.ticketCount;
      }
    }

    return {
      totalRevenue,
      totalTickets,
      cashRevenue,
      upiRevenue,
      cashTickets,
      upiTickets,
    };
  },

  async getStaffSalesStats(staffId: string, dateRange?: { start: Date; end: Date }): Promise<SaleStats> {
    await connectToDatabase();

    const match: Record<string, any> = {
      soldBy: new mongoose.Types.ObjectId(staffId),
      status: { $ne: 'cancelled' },
    };
    if (dateRange) {
      match.soldAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const sales = await SaleModel.find(match)
      .select('totalAmount ticketCount paymentMethod')
      .lean();

    let totalRevenue = 0;
    let totalTickets = 0;
    let cashRevenue = 0;
    let upiRevenue = 0;
    let cashTickets = 0;
    let upiTickets = 0;

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalTickets += sale.ticketCount;

      if (sale.paymentMethod === 'cash') {
        cashRevenue += sale.totalAmount;
        cashTickets += sale.ticketCount;
      } else if (sale.paymentMethod === 'upi') {
        upiRevenue += sale.totalAmount;
        upiTickets += sale.ticketCount;
      }
    }

    return {
      totalRevenue,
      totalTickets,
      cashRevenue,
      upiRevenue,
      cashTickets,
      upiTickets,
    };
  },
};
