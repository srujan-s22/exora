import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connection';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { TicketScan as TicketScanModel } from '@/lib/db/models/ticket-scan.model';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { Exhibition as ExhibitionModel } from '@/lib/db/models/exhibition.model';
import { applyExhibitionScopeQuery } from '@/lib/utils/exhibition-scope';

export interface AnalyticsQueryOptions {
  exhibitionId?: string;
  dateRange?: 'today' | '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
}

export class AnalyticsService {
  static async getAnalyticsData(options: AnalyticsQueryOptions = {}, currentUser?: any) {
    await connectToDatabase();

    const { exhibitionId, dateRange = '7d', startDate, endDate } = options;

    // 1. Calculate Date Boundaries
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateRange === '7d') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateRange === '30d') {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateRange === '90d') {
      start.setDate(now.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateRange === 'custom' && startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = endDate ? new Date(endDate) : new Date(startDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    // Today specific bounds for KPI calculations
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 2. Base Mongo Match Filters with Exhibition Scope
    let saleMatch: Record<string, any> = applyExhibitionScopeQuery(currentUser, {
      status: { $ne: 'cancelled' },
      soldAt: { $gte: start, $lte: end },
    }, 'exhibitionId');

    let scanMatch: Record<string, any> = applyExhibitionScopeQuery(currentUser, {
      scannedAt: { $gte: start, $lte: end },
    }, 'exhibitionId');

    let ticketMatch: Record<string, any> = applyExhibitionScopeQuery(currentUser, {
      status: { $ne: 'cancelled' },
      createdAt: { $gte: start, $lte: end },
    }, 'exhibitionId');

    if (exhibitionId && exhibitionId.trim() !== '' && exhibitionId !== 'all') {
      const exhObjId = new mongoose.Types.ObjectId(exhibitionId);
      saleMatch = applyExhibitionScopeQuery(currentUser, { ...saleMatch, exhibitionId: exhObjId }, 'exhibitionId');
      scanMatch = applyExhibitionScopeQuery(currentUser, { ...scanMatch, exhibitionId: exhObjId }, 'exhibitionId');
      ticketMatch = applyExhibitionScopeQuery(currentUser, { ...ticketMatch, exhibitionId: exhObjId }, 'exhibitionId');
    }

    // 3. Aggregate Top KPI Cards
    const [revAgg, visitorsEnteredAgg, activeCountersList, todayRevAgg, todayVisitorsAgg] = await Promise.all([
      // Total Revenue
      SaleModel.aggregate([
        { $match: saleMatch },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, tickets: { $sum: '$ticketCount' } } },
      ]),
      // Visitors Entered
      TicketScanModel.aggregate([
        { $match: { ...scanMatch, result: 'admitted' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$admittedCount', 1] } } } },
      ]),
      // Active Counters
      SaleModel.distinct('soldBy', saleMatch),
      // Today's Sales
      SaleModel.aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' },
            soldAt: { $gte: startOfToday, $lte: endOfToday },
            ...(saleMatch.exhibitionId ? { exhibitionId: saleMatch.exhibitionId } : {}),
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      // Today's Visitors / Scans
      TicketScanModel.aggregate([
        {
          $match: {
            scannedAt: { $gte: startOfToday, $lte: endOfToday },
            result: 'admitted',
            ...(scanMatch.exhibitionId ? { exhibitionId: scanMatch.exhibitionId } : {}),
          },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$admittedCount', 1] } } } },
      ]),
    ]);

    const totalRevenuePaise = revAgg[0]?.total || 0;
    const totalTicketsSold = revAgg[0]?.tickets || 0;
    const todayRevenuePaise = todayRevAgg[0]?.total || 0;
    const visitorsEntered = visitorsEnteredAgg[0]?.total || 0;
    const todayVisitors = todayVisitorsAgg[0]?.total || 0;

    const kpis = {
      totalRevenue: Math.round(totalRevenuePaise / 100),
      ticketsSold: totalTicketsSold,
      visitorsEntered: visitorsEntered as number,
      activeCounters: (activeCountersList as any[]).length,
      todaySales: Math.round(todayRevenuePaise / 100),
      todayVisitors: todayVisitors as number,
    };

    // 4. Chart 1 & Chart 2: Daily Sales / Revenue & Tickets Trend
    const dailySalesAgg = await SaleModel.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt', timezone: '+05:30' } },
          revenue: { $sum: { $divide: ['$totalAmount', 100] } },
          ticketsSold: { $sum: '$ticketCount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build complete date map to fill zero days
    const dateMap = new Map<string, { date: string; label: string; revenue: number; ticketsSold: number; entries: number }>();
    const currDate = new Date(start);

    while (currDate <= end) {
      const dateStr = currDate.toISOString().split('T')[0];
      const label = currDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dateMap.set(dateStr, { date: dateStr, label, revenue: 0, ticketsSold: 0, entries: 0 });
      currDate.setDate(currDate.getDate() + 1);
    }

    dailySalesAgg.forEach((item) => {
      if (dateMap.has(item._id)) {
        const existing = dateMap.get(item._id)!;
        existing.revenue = item.revenue;
        existing.ticketsSold = item.ticketsSold;
      }
    });

    // 5. Chart 3: Visitor Entry Trend
    const dailyEntriesAgg = await TicketScanModel.aggregate([
      { $match: { ...scanMatch, result: 'admitted' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$scannedAt', timezone: '+05:30' } },
          entries: { $sum: { $ifNull: ['$admittedCount', 1] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    dailyEntriesAgg.forEach((item) => {
      if (dateMap.has(item._id)) {
        const existing = dateMap.get(item._id)!;
        existing.entries = item.entries;
      }
    });

    const timeTrends = Array.from(dateMap.values());

    // 6. Chart 4: Sales by Counter
    const counterSalesAgg = await SaleModel.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: '$soldBy',
          revenue: { $sum: { $divide: ['$totalAmount', 100] } },
          ticketsSold: { $sum: '$ticketCount' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    const counterUserIds = counterSalesAgg.map((c) => c._id);
    const counterUsers = await UserModel.find({ _id: { $in: counterUserIds } })
      .select('name staffId')
      .lean();

    const userMap = new Map<string, string>();
    counterUsers.forEach((u: any) => {
      userMap.set(u._id.toString(), u.name || `Staff ${u.staffId}`);
    });

    const salesByCounter = counterSalesAgg.map((item) => ({
      counterId: item._id?.toString(),
      counterName: userMap.get(item._id?.toString()) || 'Unknown Counter',
      revenue: item.revenue,
      ticketsSold: item.ticketsSold,
    }));

    // 7. Chart 5: Gate Load
    const gateLoadAgg = await TicketScanModel.aggregate([
      { $match: scanMatch },
      {
        $group: {
          _id: { $ifNull: ['$gateId', '$scannedBy'] },
          totalScans: { $sum: 1 },
          admittedScans: { $sum: { $cond: [{ $eq: ['$result', 'admitted'] }, { $ifNull: ['$admittedCount', 1] }, 0] } },
          rejectedScans: { $sum: { $cond: [{ $ne: ['$result', 'admitted'] }, 1, 0] } },
        },
      },
      { $sort: { totalScans: -1 } },
      { $limit: 10 },
    ]);

    // Populate gate names / operator names if IDs match users
    const gateUserIds = gateLoadAgg.map((g) => g._id).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const gateUsers = await UserModel.find({ _id: { $in: gateUserIds } })
      .select('name staffId')
      .lean();
    const gateUserMap = new Map<string, string>();
    gateUsers.forEach((u: any) => {
      gateUserMap.set(u._id.toString(), u.name || `Gate Operator ${u.staffId}`);
    });

    const gateLoad = gateLoadAgg.map((g, idx) => {
      const idStr = g._id?.toString() || `Gate ${idx + 1}`;
      const gateName = gateUserMap.get(idStr) || (idStr.startsWith('Gate') ? idStr : `Gate ${idStr.slice(-4)}`);
      return {
        gateId: idStr,
        gateName,
        totalScans: g.totalScans,
        admittedScans: g.admittedScans,
        rejectedScans: g.rejectedScans,
      };
    });

    // 8. Chart 6: Hourly Sales Heatmap (Day of Week vs Hour of Day)
    const hourlyHeatmapAgg = await SaleModel.aggregate([
      { $match: saleMatch },
      {
        $project: {
          dayOfWeek: { $dayOfWeek: { date: '$soldAt', timezone: '+05:30' } }, // 1 = Sun, 7 = Sat
          hour: { $hour: { date: '$soldAt', timezone: '+05:30' } },
          revenue: { $divide: ['$totalAmount', 100] },
          tickets: '$ticketCount',
        },
      },
      {
        $group: {
          _id: { dayOfWeek: '$dayOfWeek', hour: '$hour' },
          revenue: { $sum: '$revenue' },
          tickets: { $sum: '$tickets' },
        },
      },
    ]);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmapMatrix: { day: string; dayIndex: number; hours: { hour: number; hourLabel: string; revenue: number; tickets: number }[] }[] = days.map((day, idx) => ({
      day,
      dayIndex: idx + 1, // 1-indexed for Mongo $dayOfWeek
      hours: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        hourLabel: `${String(h).padStart(2, '0')}:00`,
        revenue: 0,
        tickets: 0,
      })),
    }));

    hourlyHeatmapAgg.forEach((item) => {
      const dayIdx = item._id.dayOfWeek - 1; // Convert 1..7 to 0..6
      const hour = item._id.hour;
      if (heatmapMatrix[dayIdx] && heatmapMatrix[dayIdx].hours[hour]) {
        heatmapMatrix[dayIdx].hours[hour].revenue = item.revenue;
        heatmapMatrix[dayIdx].hours[hour].tickets = item.tickets;
      }
    });

    // 9. Chart 7: Exhibition Comparison
    let exhibitionComparison: { exhibitionId: string; exhibitionName: string; revenue: number; ticketsSold: number }[] = [];

    if (!exhibitionId || exhibitionId.trim() === '' || exhibitionId === 'all') {
      const exhCompAgg = await SaleModel.aggregate([
        { $match: { status: { $ne: 'cancelled' }, soldAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: '$exhibitionId',
            revenue: { $sum: { $divide: ['$totalAmount', 100] } },
            ticketsSold: { $sum: '$ticketCount' },
          },
        },
        { $sort: { revenue: -1 } },
      ]);

      const exhIds = exhCompAgg.map((e) => e._id);
      const exhDocs = await ExhibitionModel.find({ _id: { $in: exhIds } })
        .select('name')
        .lean();
      const exhMap = new Map<string, string>();
      exhDocs.forEach((e: any) => exhMap.set(e._id.toString(), e.name));

      exhibitionComparison = exhCompAgg.map((item) => ({
        exhibitionId: item._id?.toString(),
        exhibitionName: exhMap.get(item._id?.toString()) || 'Unknown Exhibition',
        revenue: item.revenue,
        ticketsSold: item.ticketsSold,
      }));
    }

    return {
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        dateRange,
      },
      kpis,
      timeTrends,
      salesByCounter,
      gateLoad,
      hourlyHeatmap: heatmapMatrix,
      exhibitionComparison,
    };
  }
}
