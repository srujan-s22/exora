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

    // 1. Fetch total active sales and counts
    const sales = await SaleModel.find({ status: { $ne: 'cancelled' } });
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

    // 1b. Fetch cancelled sales metrics for gross vs net comparison
    const cancelledSales = await SaleModel.find({ status: 'cancelled' });
    let cancelledRevenue = 0;
    let cancelledTickets = 0;
    for (const cs of cancelledSales) {
      cancelledRevenue += cs.totalAmount || 0;
      cancelledTickets += cs.ticketCount || 0;
    }

    const grossRevenue = totalRevenue + cancelledRevenue;
    const grossTickets = ticketsSold + cancelledTickets;

    // 2. Scans logs aggregations
    const scans = await TicketScanModel.find({});
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

    const todaySales = await SaleModel.find({ soldAt: { $gte: startOfToday, $lte: endOfToday }, status: { $ne: 'cancelled' } });
    let todayRevenue = 0;
    let todayTickets = 0;
    for (const s of todaySales) {
      todayRevenue += s.totalAmount || 0;
      todayTickets += s.ticketCount || 0;
    }

    const yesterdaySales = await SaleModel.find({ soldAt: { $gte: startOfYesterday, $lte: endOfYesterday }, status: { $ne: 'cancelled' } });
    let yesterdayRevenue = 0;
    for (const s of yesterdaySales) {
      yesterdayRevenue += s.totalAmount || 0;
    }

    const todayScans = await TicketScanModel.countDocuments({ scannedAt: { $gte: startOfToday, $lte: endOfToday } });
    const todayAdmittedScans = await TicketScanModel.find({ scannedAt: { $gte: startOfToday, $lte: endOfToday }, result: 'admitted' });
    const todayAdmitted = todayAdmittedScans.reduce((sum, sc) => sum + (sc.admittedCount || 1), 0);
    const todayFlags = await TicketScanModel.countDocuments({ scannedAt: { $gte: startOfToday, $lte: endOfToday }, result: { $regex: /^rejected_/ } });

    // 4. Counts of entities
    const activeExhibitionsCount = await ExhibitionModel.countDocuments({ status: 'active', archive: { $ne: true } });
    const staffCount = await UserModel.countDocuments({ role: { $ne: 'admin' }, isActive: true });

    // 5. Exhibition wise analytics breakdown
    const exhibitionBreakdown = [];
    const allExhibitions = await ExhibitionModel.find({ archive: { $ne: true } }).sort({ createdAt: -1 });
    
    for (const exh of allExhibitions) {
      const soldCount = await TicketModel.countDocuments({ exhibitionId: exh._id, status: { $ne: 'cancelled' } });
      const exhSales = await SaleModel.find({ exhibitionId: exh._id, status: { $ne: 'cancelled' } });
      const rev = exhSales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      const exhAdmittedScans = await TicketScanModel.find({ exhibitionId: exh._id, result: 'admitted' });
      const admitted = exhAdmittedScans.reduce((sum, sc) => sum + (sc.admittedCount || 1), 0);

      exhibitionBreakdown.push({
        id: exh._id.toString(),
        name: exh.name,
        status: exh.status,
        ticketsSold: soldCount,
        revenue: rev,
        admitted,
        capacity: exh.capacity || 0,
        utilization: exh.capacity > 0 ? Math.round((admitted / exh.capacity) * 100) : 100,
      });
    }

    // 6. Recent feeds
    const recentSales = await SaleModel.find({})
      .sort({ soldAt: -1 })
      .limit(6)
      .populate('soldBy', 'name staffId')
      .populate('exhibitionId', 'name');

    const recentScans = await TicketScanModel.find({})
      .sort({ scannedAt: -1 })
      .limit(6)
      .populate('scannedBy', 'name staffId')
      .populate('exhibitionId', 'name')
      .populate('ticketId', 'ticketNumber');

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

    const sales = await SaleModel.find(match);

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
};
