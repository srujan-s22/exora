import mongoose from 'mongoose';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { TicketScan as TicketScanModel } from '@/lib/db/models/ticket-scan.model';
import { Exhibition as ExhibitionModel } from '@/lib/db/models/exhibition.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';

import { getUserExhibitionScope, applyExhibitionScopeQuery } from '@/lib/utils/exhibition-scope';

/**
 * Dashboard metrics service.
 * Aggregates data across collections for admin, counter, and gate displays.
 */
export const DashboardService = {
  async getAdminMetrics(user?: any): Promise<Record<string, any>> {
    await connectToDatabase();

    const scope = getUserExhibitionScope(user);
    if (!scope.isGlobal && scope.allowedExhibitionIds.length === 0) {
      return {
        noExhibitionsAssigned: true,
        stats: {
          totalRevenue: 0,
          ticketsSold: 0,
          validEntries: 0,
          invalidScans: 0,
          duplicateBlocks: 0,
          wrongExhibitions: 0,
          forgedAttempts: 0,
          todayRevenue: 0,
          todayTickets: 0,
          yesterdayRevenue: 0,
          activeExhibitionsCount: 0,
          staffCount: 0,
        },
        paymentBreakdown: {
          cashRevenue: 0,
          upiRevenue: 0,
          cashTickets: 0,
          upiTickets: 0,
        },
        exhibitionBreakdown: [],
        recentSales: [],
        recentScans: [],
      };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const endOfYesterday = new Date(endOfToday.getTime() - 24 * 60 * 60 * 1000);

    const saleScopeMatch = applyExhibitionScopeQuery(user, {}, 'exhibitionId');
    const scanScopeMatch = applyExhibitionScopeQuery(user, {}, 'exhibitionId');
    const exhibitionScopeMatch = applyExhibitionScopeQuery(user, { archive: { $ne: true } }, '_id');
    const exhibitionActiveScopeMatch = applyExhibitionScopeQuery(user, { status: 'active', archive: { $ne: true } }, '_id');

    // Run independent top-level aggregations and queries concurrently in parallel
    const [
      salesAggResult,
      scansAggResult,
      todaySalesAggResult,
      yesterdaySalesAggResult,
      todayScansAggResult,
      activeExhibitionsCount,
      staffCount,
      allExhibitions,
      recentSalesDocs,
      recentScansDocs,
    ] = await Promise.all([
      // 1. All-time Sales Aggregation (Active + Cancelled + Cash/UPI breakdown)
      SaleModel.aggregate([
        { $match: saleScopeMatch },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, { $ifNull: ['$totalAmount', 0] }, 0] }
            },
            ticketsSold: {
              $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, { $ifNull: ['$ticketCount', 0] }, 0] }
            },
            cashRevenue: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$status', 'cancelled'] }, { $eq: ['$paymentMethod', 'cash'] }] },
                  { $ifNull: ['$totalAmount', 0] },
                  0
                ]
              }
            },
            cashTickets: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$status', 'cancelled'] }, { $eq: ['$paymentMethod', 'cash'] }] },
                  { $ifNull: ['$ticketCount', 0] },
                  0
                ]
              }
            },
            upiRevenue: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$status', 'cancelled'] }, { $eq: ['$paymentMethod', 'upi'] }] },
                  { $ifNull: ['$totalAmount', 0] },
                  0
                ]
              }
            },
            upiTickets: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$status', 'cancelled'] }, { $eq: ['$paymentMethod', 'upi'] }] },
                  { $ifNull: ['$ticketCount', 0] },
                  0
                ]
              }
            },
            cancelledRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, { $ifNull: ['$totalAmount', 0] }, 0] }
            },
            cancelledTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, { $ifNull: ['$ticketCount', 0] }, 0] }
            },
          }
        }
      ]),

      // 2. All-time Ticket Scans Aggregation
      TicketScanModel.aggregate([
        { $match: scanScopeMatch },
        {
          $group: {
            _id: null,
            validEntries: {
              $sum: { $cond: [{ $eq: ['$result', 'admitted'] }, { $ifNull: ['$admittedCount', 1] }, 0] }
            },
            invalidScans: {
              $sum: { $cond: [{ $ne: ['$result', 'admitted'] }, 1, 0] }
            },
            duplicateBlocks: {
              $sum: { $cond: [{ $eq: ['$result', 'rejected_used'] }, 1, 0] }
            },
            wrongExhibitions: {
              $sum: { $cond: [{ $eq: ['$result', 'rejected_wrong_exhibition'] }, 1, 0] }
            },
            forgedAttempts: {
              $sum: { $cond: [{ $eq: ['$result', 'rejected_unknown'] }, 1, 0] }
            },
          }
        }
      ]),

      // 3a. Today Sales Aggregation
      SaleModel.aggregate([
        { $match: { ...saleScopeMatch, soldAt: { $gte: startOfToday, $lte: endOfToday }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
            todayTickets: { $sum: { $ifNull: ['$ticketCount', 0] } },
          }
        }
      ]),

      // 3b. Yesterday Sales Aggregation
      SaleModel.aggregate([
        { $match: { ...saleScopeMatch, soldAt: { $gte: startOfYesterday, $lte: endOfYesterday }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            yesterdayRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
          }
        }
      ]),

      // 3c. Today Scans Aggregation
      TicketScanModel.aggregate([
        { $match: { ...scanScopeMatch, scannedAt: { $gte: startOfToday, $lte: endOfToday } } },
        {
          $group: {
            _id: null,
            todayScans: { $sum: 1 },
            todayAdmitted: {
              $sum: { $cond: [{ $eq: ['$result', 'admitted'] }, { $ifNull: ['$admittedCount', 1] }, 0] }
            },
            todayFlags: {
              $sum: { $cond: [{ $regexMatch: { input: '$result', regex: /^rejected_/ } }, 1, 0] }
            },
          }
        }
      ]),

      // 4. Entity Counts
      ExhibitionModel.countDocuments(exhibitionActiveScopeMatch),
      UserModel.countDocuments({ role: { $ne: 'admin' }, isActive: true }),

      // 5. All Exhibitions for breakdown
      ExhibitionModel.find(exhibitionScopeMatch)
        .sort({ createdAt: -1, _id: -1 })
        .lean(),

      // 6. Recent feeds
      SaleModel.find(saleScopeMatch)
        .sort({ soldAt: -1, _id: -1 })
        .limit(6)
        .populate('soldBy', 'name staffId')
        .populate('exhibitionId', 'name')
        .lean(),

      TicketScanModel.find(scanScopeMatch)
        .sort({ scannedAt: -1, _id: -1 })
        .limit(6)
        .populate('scannedBy', 'name staffId')
        .populate('exhibitionId', 'name')
        .populate('ticketId', 'ticketNumber')
        .lean(),
    ]);

    // Extract aggregated sales stats
    const salesStats = salesAggResult[0] || {};
    const totalRevenue = salesStats.totalRevenue || 0;
    const ticketsSold = salesStats.ticketsSold || 0;
    const cashRevenue = salesStats.cashRevenue || 0;
    const cashTickets = salesStats.cashTickets || 0;
    const upiRevenue = salesStats.upiRevenue || 0;
    const upiTickets = salesStats.upiTickets || 0;
    const cancelledRevenue = salesStats.cancelledRevenue || 0;
    const cancelledTickets = salesStats.cancelledTickets || 0;
    const grossRevenue = totalRevenue + cancelledRevenue;
    const grossTickets = ticketsSold + cancelledTickets;

    // Extract aggregated scans stats
    const scanStats = scansAggResult[0] || {};
    const validEntries = scanStats.validEntries || 0;
    const invalidScans = scanStats.invalidScans || 0;
    const duplicateBlocks = scanStats.duplicateBlocks || 0;
    const wrongExhibitions = scanStats.wrongExhibitions || 0;
    const forgedAttempts = scanStats.forgedAttempts || 0;

    // Extract today & yesterday trends
    const todaySalesStats = todaySalesAggResult[0] || {};
    const todayRevenue = todaySalesStats.todayRevenue || 0;
    const todayTickets = todaySalesStats.todayTickets || 0;

    const yesterdaySalesStats = yesterdaySalesAggResult[0] || {};
    const yesterdayRevenue = yesterdaySalesStats.yesterdayRevenue || 0;

    const todayScanStats = todayScansAggResult[0] || {};
    const todayScans = todayScanStats.todayScans || 0;
    const todayAdmitted = todayScanStats.todayAdmitted || 0;
    const todayFlags = todayScanStats.todayFlags || 0;

    // Exhibition wise analytics breakdown (Batched aggregate queries to eliminate N+1)
    const exhIds = allExhibitions.map((e: any) => e._id);

    const [ticketCountsAgg, salesRevAgg, admittedAgg] = await Promise.all([
      TicketModel.aggregate([
        { $match: { exhibitionId: { $in: exhIds }, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$exhibitionId', count: { $sum: 1 } } },
      ]),
      SaleModel.aggregate([
        { $match: { exhibitionId: { $in: exhIds }, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$exhibitionId', total: { $sum: '$totalAmount' } } },
      ]),
      TicketScanModel.aggregate([
        { $match: { exhibitionId: { $in: exhIds }, result: 'admitted' } },
        { $group: { _id: '$exhibitionId', totalAdmitted: { $sum: { $ifNull: ['$admittedCount', 1] } } } },
      ]),
    ]);

    const ticketCountMap = new Map<string, number>();
    ticketCountsAgg.forEach((t: any) => ticketCountMap.set(t._id.toString(), t.count));

    const salesRevMap = new Map<string, number>();
    salesRevAgg.forEach((s: any) => salesRevMap.set(s._id.toString(), s.total));

    const admittedMap = new Map<string, number>();
    admittedAgg.forEach((a: any) => admittedMap.set(a._id.toString(), a.totalAdmitted));

    const isSuperAdmin = user?.role === 'super_admin';
    const exhibitionBreakdown = allExhibitions.map((exh: any) => {
      const exhIdStr = exh._id.toString();
      const soldCount = ticketCountMap.get(exhIdStr) || 0;
      const rev = salesRevMap.get(exhIdStr) || 0;
      const admitted = admittedMap.get(exhIdStr) || 0;
      const capacity = exh.capacity || 0;

      return {
        id: exhIdStr,
        name: exh.name,
        status: exh.status,
        venue: exh.venue || exh.location?.venueName || '',
        address: exh.address || exh.location?.address || '',
        category: exh.category,
        startDate: exh.startDate,
        endDate: exh.endDate,
        // Centralized exhibition map data (coordinates) is strictly Super Admin only
        location: isSuperAdmin ? (exh.location || null) : null,
        ticketsSold: soldCount,
        revenue: rev,
        admitted,
        capacity,
        utilization: capacity > 0 ? Math.round((admitted / capacity) * 100) : 100,
      };
    });

    // Format recent feeds
    const recentSales = recentSalesDocs.map((s: any) => ({
      ...s,
      id: s._id.toString(),
      soldBy: s.soldBy ? { ...s.soldBy, id: s.soldBy._id?.toString() } : undefined,
      exhibitionId: s.exhibitionId ? { ...s.exhibitionId, id: s.exhibitionId._id?.toString() } : undefined,
    }));

    const recentScans = recentScansDocs.map((sc: any) => ({
      ...sc,
      id: sc._id.toString(),
      scannedBy: sc.scannedBy ? { ...sc.scannedBy, id: sc.scannedBy._id?.toString() } : undefined,
      exhibitionId: sc.exhibitionId ? { ...sc.exhibitionId, id: sc.exhibitionId._id?.toString() } : undefined,
      ticketId: sc.ticketId ? { ...sc.ticketId, id: sc.ticketId._id?.toString() } : undefined,
    }));

    return {
      stats: {
        totalRevenue,
        ticketsSold,
        grossRevenue,
        grossTickets,
        cancelledRevenue,
        cancelledTickets,
        validEntries,
        invalidScans,
        activeExhibitionsCount,
        staffCount,
        todayRevenue,
        todayTickets,
        yesterdayRevenue,
        todayScans,
        todayAdmitted,
        todayFlags,
        duplicateBlocks,
        wrongExhibitions,
        forgedAttempts,
      },
      paymentBreakdown: {
        cashRevenue,
        upiRevenue,
        cashTickets,
        upiTickets,
      },
      exhibitionBreakdown,
      recentSales,
      recentScans,
    };
  },

  async getCounterMetrics(userId: string): Promise<Record<string, any>> {
    await connectToDatabase();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const match: Record<string, any> = {
      soldBy: new mongoose.Types.ObjectId(userId),
      soldAt: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'cancelled' },
    };

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

  async getGateMetrics(userId: string): Promise<Record<string, any>> {
    await connectToDatabase();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const query: Record<string, any> = {
      scannedBy: new mongoose.Types.ObjectId(userId),
      scannedAt: { $gte: startOfToday, $lte: endOfToday },
    };

    const scans = await TicketScanModel.find(query)
      .select('result admittedCount')
      .lean();

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
};
