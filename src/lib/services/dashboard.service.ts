import mongoose from 'mongoose';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { TicketScan as TicketScanModel } from '@/lib/db/models/ticket-scan.model';
import { Exhibition as ExhibitionModel } from '@/lib/db/models/exhibition.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';

/**
 * Dashboard metrics service.
 * Aggregates data across collections for admin, counter, and gate displays.
 */
export const DashboardService = {
  async getAdminMetrics(): Promise<Record<string, any>> {
    await connectToDatabase();

    // 1. Fetch active sales with lean & selective fields
    const sales = await SaleModel.find({ status: { $ne: 'cancelled' } })
      .select('totalAmount ticketCount paymentMethod')
      .lean();

    let totalRevenue = 0;
    let ticketsSold = 0;
    let cashRevenue = 0;
    let upiRevenue = 0;
    let cashTickets = 0;
    let upiTickets = 0;

    for (const s of sales) {
      totalRevenue += s.totalAmount || 0;
      ticketsSold += s.ticketCount || 0;
      if (s.paymentMethod === 'cash') {
        cashRevenue += s.totalAmount || 0;
        cashTickets += s.ticketCount || 0;
      } else if (s.paymentMethod === 'upi') {
        upiRevenue += s.totalAmount || 0;
        upiTickets += s.ticketCount || 0;
      }
    }

    // 1b. Fetch cancelled sales metrics with lean & selective fields
    const cancelledSales = await SaleModel.find({ status: 'cancelled' })
      .select('totalAmount ticketCount')
      .lean();
    let cancelledRevenue = 0;
    let cancelledTickets = 0;
    for (const cs of cancelledSales) {
      cancelledRevenue += cs.totalAmount || 0;
      cancelledTickets += cs.ticketCount || 0;
    }

    const grossRevenue = totalRevenue + cancelledRevenue;
    const grossTickets = ticketsSold + cancelledTickets;

    // 2. Scans logs aggregations (lean & selective fields)
    const scans = await TicketScanModel.find({})
      .select('result admittedCount')
      .lean();
    let validEntries = 0;
    let invalidScans = 0;
    let duplicateBlocks = 0;
    let wrongExhibitions = 0;
    let forgedAttempts = 0;

    for (const sc of scans) {
      if (sc.result === 'admitted') {
        validEntries += sc.admittedCount || 1;
      } else {
        invalidScans++;
        if (sc.result === 'rejected_used') duplicateBlocks++;
        else if (sc.result === 'rejected_wrong_exhibition') wrongExhibitions++;
        else if (sc.result === 'rejected_unknown') forgedAttempts++;
      }
    }

    // 3. Today's stats vs yesterday's (Trend computations)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const endOfYesterday = new Date(endOfToday.getTime() - 24 * 60 * 60 * 1000);

    const todaySales = await SaleModel.find({ soldAt: { $gte: startOfToday, $lte: endOfToday }, status: { $ne: 'cancelled' } })
      .select('totalAmount ticketCount')
      .lean();
    let todayRevenue = 0;
    let todayTickets = 0;
    for (const s of todaySales) {
      todayRevenue += s.totalAmount || 0;
      todayTickets += s.ticketCount || 0;
    }

    const yesterdaySales = await SaleModel.find({ soldAt: { $gte: startOfYesterday, $lte: endOfYesterday }, status: { $ne: 'cancelled' } })
      .select('totalAmount')
      .lean();
    let yesterdayRevenue = 0;
    for (const s of yesterdaySales) {
      yesterdayRevenue += s.totalAmount || 0;
    }

    const todayScans = await TicketScanModel.countDocuments({ scannedAt: { $gte: startOfToday, $lte: endOfToday } });
    const todayAdmittedScans = await TicketScanModel.find({ scannedAt: { $gte: startOfToday, $lte: endOfToday }, result: 'admitted' })
      .select('admittedCount')
      .lean();
    const todayAdmitted = todayAdmittedScans.reduce((sum, sc) => sum + (sc.admittedCount || 1), 0);
    const todayFlags = await TicketScanModel.countDocuments({ scannedAt: { $gte: startOfToday, $lte: endOfToday }, result: { $regex: /^rejected_/ } });

    // 4. Counts of entities
    const activeExhibitionsCount = await ExhibitionModel.countDocuments({ status: 'active', archive: { $ne: true } });
    const staffCount = await UserModel.countDocuments({ role: { $ne: 'admin' }, isActive: true });

    // 5. Exhibition wise analytics breakdown (Batched aggregate queries to eliminate N+1)
    const allExhibitions = await ExhibitionModel.find({ archive: { $ne: true } })
      .sort({ createdAt: -1, _id: -1 })
      .lean();
    
    const exhIds = allExhibitions.map((e) => e._id);

    // Batch query 1: Sold tickets per exhibition
    const ticketCountsAgg = await TicketModel.aggregate([
      { $match: { exhibitionId: { $in: exhIds }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$exhibitionId', count: { $sum: 1 } } },
    ]);
    const ticketCountMap = new Map<string, number>();
    ticketCountsAgg.forEach((t) => ticketCountMap.set(t._id.toString(), t.count));

    // Batch query 2: Sales revenue per exhibition
    const salesRevAgg = await SaleModel.aggregate([
      { $match: { exhibitionId: { $in: exhIds }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$exhibitionId', total: { $sum: '$totalAmount' } } },
    ]);
    const salesRevMap = new Map<string, number>();
    salesRevAgg.forEach((s) => salesRevMap.set(s._id.toString(), s.total));

    // Batch query 3: Admitted count per exhibition
    const admittedAgg = await TicketScanModel.aggregate([
      { $match: { exhibitionId: { $in: exhIds }, result: 'admitted' } },
      { $group: { _id: '$exhibitionId', totalAdmitted: { $sum: { $ifNull: ['$admittedCount', 1] } } } },
    ]);
    const admittedMap = new Map<string, number>();
    admittedAgg.forEach((a) => admittedMap.set(a._id.toString(), a.totalAdmitted));

    const exhibitionBreakdown = allExhibitions.map((exh) => {
      const exhIdStr = exh._id.toString();
      const soldCount = ticketCountMap.get(exhIdStr) || 0;
      const rev = salesRevMap.get(exhIdStr) || 0;
      const admitted = admittedMap.get(exhIdStr) || 0;
      const capacity = exh.capacity || 0;

      return {
        id: exhIdStr,
        name: exh.name,
        status: exh.status,
        ticketsSold: soldCount,
        revenue: rev,
        admitted,
        capacity,
        utilization: capacity > 0 ? Math.round((admitted / capacity) * 100) : 100,
      };
    });

    // 6. Recent feeds with lean & selective populate
    const recentSalesDocs = await SaleModel.find({})
      .sort({ soldAt: -1, _id: -1 })
      .limit(6)
      .populate('soldBy', 'name staffId')
      .populate('exhibitionId', 'name')
      .lean();

    const recentScansDocs = await TicketScanModel.find({})
      .sort({ scannedAt: -1, _id: -1 })
      .limit(6)
      .populate('scannedBy', 'name staffId')
      .populate('exhibitionId', 'name')
      .populate('ticketId', 'ticketNumber')
      .lean();

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
