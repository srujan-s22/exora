import mongoose from 'mongoose';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { Exhibition as ExhibitionModel } from '@/lib/db/models/exhibition.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { TicketScan as TicketScanModel } from '@/lib/db/models/ticket-scan.model';
import { AuditLog as AuditLogModel } from '@/lib/db/models/audit-log.model';
import { connectToDatabase } from '@/lib/db/connection';
import type { RiskLevel, FraudOverview, ReconciliationRow, StaffRiskProfile, ExhibitionRiskProfile, TicketForensics } from '@/types/fraud.types';
import type { Sale } from '@/types/sale.types';

export const FraudService = {
  /**
   * Fetch aggregate counts for the fraud dashboard overview.
   */
  async getOverviewMetrics(): Promise<FraudOverview & { suspiciousIncidents: any[]; securityViolationsCount: number }> {
    await connectToDatabase();

    const totalScans = await TicketScanModel.countDocuments({});
    const validScans = await TicketScanModel.countDocuments({ result: 'admitted' });
    const duplicateScans = await TicketScanModel.countDocuments({ result: 'rejected_used' });
    const wrongExhibitionScans = await TicketScanModel.countDocuments({ result: 'rejected_wrong_exhibition' });
    const forgedAttempts = await TicketScanModel.countDocuments({ result: 'rejected_unknown' });
    const invalidScans = await TicketScanModel.countDocuments({ result: { $regex: /^rejected_/ } });

    // Count security violations (unauthorized password reset attempts on super admins)
    const securityViolationsCount = await AuditLogModel.countDocuments({
      action: 'password_reset.requested',
      'details.unauthorizedAttempt': true
    });

    // Active alerts count = total rejections + suspicious audit log entries (spikes) + security violations
    const activeAlertsCount = duplicateScans + forgedAttempts + wrongExhibitionScans + securityViolationsCount;

    // Get 15 recent suspicious scan incidents
    const suspiciousScans = await TicketScanModel.find({ result: { $ne: 'admitted' } })
      .sort({ scannedAt: -1 })
      .limit(15)
      .populate('scannedBy', 'name staffId')
      .populate('exhibitionId', 'name')
      .populate('ticketId', 'ticketNumber');

    // Get 15 recent security violations
    const securityAudits = await AuditLogModel.find({
      action: 'password_reset.requested',
      'details.unauthorizedAttempt': true
    })
      .sort({ timestamp: -1 })
      .limit(15)
      .populate('performedBy', 'name staffId');

    const suspiciousIncidents = [
      ...suspiciousScans.map(s => ({
        id: s._id.toString(),
        ticketNumber: (s.ticketId as any)?.ticketNumber || 'UNKNOWN',
        exhibitionName: (s.exhibitionId as any)?.name || 'Exhibition',
        exhibitionId: (s.exhibitionId as any)?._id?.toString() || '',
        scannedBy: s.scannedBy ? {
          name: (s.scannedBy as any).name,
          staffId: (s.scannedBy as any).staffId,
        } : null,
        scannedAt: s.scannedAt,
        result: s.result,
        reason: s.reason || 'Blocked scan attempt',
        gateId: s.gateId || 'Gate Checkpoint',
      })),
      ...securityAudits.map(a => ({
        id: a._id.toString(),
        ticketNumber: 'SECURITY_ALERT',
        exhibitionName: 'System Security',
        exhibitionId: '',
        scannedBy: a.performedBy ? {
          name: a.performedBy.name,
          staffId: a.performedBy.staffId,
        } : null,
        scannedAt: a.timestamp,
        result: 'security_violation',
        reason: a.details?.reason || 'Unauthorized password reset attempt',
        gateId: 'Security Control',
      }))
    ]
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, 15);

    return {
      totalScans,
      validScans,
      invalidScans,
      duplicateScans,
      wrongExhibitionScans,
      forgedAttempts,
      securityViolationsCount,
      activeAlertsCount,
      suspiciousIncidents,
    };
  },

  /**
   * Compares expected ticket sales counts and prices vs collected transaction totals.
   */
  async getReconciliationData(): Promise<ReconciliationRow[]> {
    await connectToDatabase();

    const exhibitions = await ExhibitionModel.find({ archive: { $ne: true } }).sort({ createdAt: -1 });
    const report: ReconciliationRow[] = [];

    for (const exh of exhibitions) {
      // Tickets issued for this exhibition
      const ticketsSold = await TicketModel.countDocuments({ exhibitionId: exh._id });

      // Admitted scans at the gate
      const ticketsScanned = await TicketScanModel.countDocuments({ exhibitionId: exh._id, result: 'admitted' });

      // Expected revenue (sum of price on all generated tickets)
      const ticketRevenueAgg = await TicketModel.aggregate([
        { $match: { exhibitionId: exh._id } },
        { $group: { _id: null, expected: { $sum: '$price' } } }
      ]);
      const expectedRevenue = ticketRevenueAgg[0]?.expected || 0;

      // Collected revenue (sum of totalAmount on sales)
      const salesRevenueAgg = await SaleModel.aggregate([
        { $match: { exhibitionId: exh._id } },
        { $group: { _id: null, collected: { $sum: '$totalAmount' } } }
      ]);
      const collectedRevenue = salesRevenueAgg[0]?.collected || 0;

      report.push({
        exhibitionId: exh._id.toString(),
        exhibitionName: exh.name,
        status: exh.status,
        ticketsSold,
        ticketsScanned,
        mismatchCount: ticketsScanned - ticketsSold, // positive number signals gate bypass/counterfeit
        expectedRevenue,
        collectedRevenue,
        revenueMismatch: collectedRevenue - expectedRevenue,
      });
    }

    return report;
  },

  /**
   * Compile staff transaction behaviors, scan rejections, and compute risk levels.
   */
  async getStaffRiskSummary(): Promise<StaffRiskProfile[]> {
    await connectToDatabase();

    // Query active operators (excluding super_admin, including admin and other staff)
    const staff = await UserModel.find({ role: { $ne: 'super_admin' }, isActive: true }).sort({ name: 1 });
    const profiles: StaffRiskProfile[] = [];

    for (const member of staff) {
      const userId = member._id;

      let totalTransactions = 0;
      let invalidCount = 0;
      let duplicateCount = 0;
      let forgeryCount = 0;
      let mismatchCount = 0;

      let riskScore = 10; // default low risk
      let reason = 'Normal operational patterns within bounds.';

      if (member.role === 'counter') {
        // Counter sales total
        totalTransactions = await SaleModel.countDocuments({ soldBy: userId });

        // Fetch sales with anomalies (e.g. ticket count mismatch if totalAmount is 0 for non-free)
        // For simplicity: count sales that have notes containing warnings
        mismatchCount = await SaleModel.countDocuments({
          soldBy: userId,
          paymentStatus: 'pending'
        });

        if (mismatchCount > 0) {
          riskScore = 55;
          reason = `${mismatchCount} pending payment invoices outstanding.`;
        }
      } else if (member.role === 'gate') {
        // Gate check-in count
        totalTransactions = await TicketScanModel.countDocuments({ scannedBy: userId });
        duplicateCount = await TicketScanModel.countDocuments({ scannedBy: userId, result: 'rejected_used' });
        forgeryCount = await TicketScanModel.countDocuments({ scannedBy: userId, result: 'rejected_unknown' });
        invalidCount = await TicketScanModel.countDocuments({ scannedBy: userId, result: { $regex: /^rejected_/ } });

        const rejectionRate = totalTransactions > 0 ? (invalidCount / totalTransactions) * 100 : 0;
        const forgeryRate = totalTransactions > 0 ? (forgeryCount / totalTransactions) * 100 : 0;

        if (forgeryRate > 5 || rejectionRate > 20) {
          riskScore = 95;
          reason = `Critical: Scan forgery rate (${forgeryRate.toFixed(1)}%) or rejection rate (${rejectionRate.toFixed(1)}%) exceeds limits.`;
        } else if (rejectionRate > 10 || forgeryRate > 2) {
          riskScore = 70;
          reason = `High duplicate rejections (${rejectionRate.toFixed(1)}%) observed. Potential pass leakage.`;
        } else if (rejectionRate > 4) {
          riskScore = 40;
          reason = `Medium risk: Scan invalid checks at ${rejectionRate.toFixed(1)}%.`;
        }
      }

      // Check for security violations (like attempting to reset super admin password)
      const securityViolations = await AuditLogModel.countDocuments({
        action: 'password_reset.requested',
        performedBy: userId,
        'details.unauthorizedAttempt': true
      });

      if (securityViolations > 0) {
        riskScore = Math.min(100, riskScore + securityViolations * 75);
        reason = `Security violation: Tried to request password reset for a Super Admin ${securityViolations} time(s).`;
      }

      let riskLevel: RiskLevel = 'low';
      if (riskScore >= 80) riskLevel = 'critical';
      else if (riskScore >= 60) riskLevel = 'high';
      else if (riskScore >= 30) riskLevel = 'medium';

      profiles.push({
        staffId: member.staffId || member._id.toString(),
        name: member.name,
        role: member.role as 'admin' | 'counter' | 'gate' | 'ride',
        totalTransactions,
        invalidCount,
        duplicateCount,
        forgeryCount,
        mismatchCount,
        riskScore,
        riskLevel,
        reason,
      });
    }

    return profiles;
  },

  /**
   * Audits exhibitions for scan rejection triggers or bypass metrics.
   */
  async getExhibitionRiskProfiles(): Promise<ExhibitionRiskProfile[]> {
    await connectToDatabase();

    const exhibitions = await ExhibitionModel.find({ archive: { $ne: true } }).sort({ createdAt: -1 });
    const profiles: ExhibitionRiskProfile[] = [];

    for (const exh of exhibitions) {
      const ticketsIssued = await TicketModel.countDocuments({ exhibitionId: exh._id });
      const validEntries = await TicketScanModel.countDocuments({ exhibitionId: exh._id, result: 'admitted' });
      const duplicateScans = await TicketScanModel.countDocuments({ exhibitionId: exh._id, result: 'rejected_used' });
      const forgeryScans = await TicketScanModel.countDocuments({ exhibitionId: exh._id, result: 'rejected_unknown' });
      const invalidScans = await TicketScanModel.countDocuments({ exhibitionId: exh._id, result: { $regex: /^rejected_/ } });

      const totalScans = validEntries + invalidScans;
      const scanRejectionRate = totalScans > 0 ? (invalidScans / totalScans) * 100 : 0;
      const mismatchCount = Math.max(0, validEntries - ticketsIssued);

      let riskScore = 15;
      let reason = 'Low risk: Scans and ticket parameters match.';

      if (validEntries > ticketsIssued) {
        riskScore = 98;
        reason = `CRITICAL: Gate admissions (${validEntries}) exceed tickets sold (${ticketsIssued})! Bypass or counterfeit detected.`;
      } else if (scanRejectionRate > 15 || forgeryScans > 10) {
        riskScore = 75;
        reason = `High: Scan rejection rate at ${scanRejectionRate.toFixed(1)}% with ${forgeryScans} forged attempts.`;
      } else if (scanRejectionRate > 6) {
        riskScore = 45;
        reason = `Medium: Moderate scan failure rate (${scanRejectionRate.toFixed(1)}%).`;
      }

      let riskLevel: RiskLevel = 'low';
      if (riskScore >= 80) riskLevel = 'critical';
      else if (riskScore >= 60) riskLevel = 'high';
      else if (riskScore >= 30) riskLevel = 'medium';

      profiles.push({
        exhibitionId: exh._id.toString(),
        name: exh.name,
        status: exh.status,
        ticketsIssued,
        validEntries,
        invalidScans,
        duplicateScans,
        forgeryScans,
        mismatchCount,
        riskScore,
        riskLevel,
        reason,
      });
    }

    return profiles;
  },

  /**
   * Compiles the full history diagram details of a single ticket (Forensics audit).
   */
  async getTicketForensics(ticketIdOrNumber: string): Promise<TicketForensics> {
    await connectToDatabase();

    // Query ticket
    let ticket = null;
    if (mongoose.Types.ObjectId.isValid(ticketIdOrNumber)) {
      ticket = await TicketModel.findById(ticketIdOrNumber);
    }
    if (!ticket) {
      ticket = await TicketModel.findOne({ ticketNumber: ticketIdOrNumber.trim() });
    }

    if (!ticket) {
      throw new Error(`Ticket with ID or Reference '${ticketIdOrNumber}' not found.`);
    }

    // Related sale transaction
    const sale = await SaleModel.findOne({ tickets: ticket._id })
      .populate('soldBy', 'name staffId')
      .populate('exhibitionId', 'name venue');

    // Scans history
    const scansList = await TicketScanModel.find({ ticketId: ticket._id })
      .sort({ scannedAt: 1 })
      .populate('scannedBy', 'name staffId');

    const scans = scansList.map(s => ({
      id: s._id.toString(),
      scannedAt: s.scannedAt,
      scannedByName: (s.scannedBy as any)?.name || 'Gate Operator',
      scannedByStaffId: (s.scannedBy as any)?.staffId || 'UNKNOWN',
      result: s.result,
      reason: s.reason || '',
      gateId: s.gateId,
    }));

    // Audit logs tracking targetId
    const auditLogsList = await AuditLogModel.find({ targetId: ticket._id.toString() })
      .sort({ timestamp: 1 })
      .populate('performedBy', 'name staffId');

    const auditLogs = auditLogsList.map(l => ({
      id: l._id.toString(),
      timestamp: l.timestamp,
      action: l.action,
      performedByName: l.performedBy?.name || 'Staff User',
      details: l.details || '',
    }));

    return {
      ticket: ticket.toJSON() as unknown as any,
      sale: sale ? (sale.toJSON() as unknown as Sale) : null,
      scans,
      auditLogs,
    };
  },

  /**
   * Compiles the staff action timeline history.
   */
  async getStaffActivityTimeline(staffId: string): Promise<any[]> {
    await connectToDatabase();

    let user = await UserModel.findOne({ staffId: staffId.trim() });
    if (!user && mongoose.Types.ObjectId.isValid(staffId)) {
      user = await UserModel.findById(staffId);
    }

    if (!user) {
      throw new Error(`Staff member with ID '${staffId}' not found.`);
    }

    const timeline: any[] = [];

    // If counter, gather sales
    const sales = await SaleModel.find({ soldBy: user._id })
      .sort({ soldAt: -1 })
      .limit(50)
      .populate('exhibitionId', 'name');

    sales.forEach(s => {
      timeline.push({
        id: s._id.toString(),
        timestamp: s.soldAt,
        type: 'sale',
        title: 'Ticket Sales Generated',
        description: `Issued ${s.ticketCount} tickets (${s.ticketType}) for ${s.exhibitionId?.name || 'Exhibition'} via ${s.paymentMethod.toUpperCase()}`,
        value: `₹${s.totalAmount / 100}`,
        severity: 'low',
        meta: {
          transactionId: s.transactionId,
          customerName: s.customerName,
        }
      });
    });

    // Gather scans
    const scans = await TicketScanModel.find({ scannedBy: user._id })
      .sort({ scannedAt: -1 })
      .limit(50)
      .populate('exhibitionId', 'name')
      .populate('ticketId', 'ticketNumber');

    scans.forEach(sc => {
      const isRejection = sc.result.startsWith('rejected_');
      const tNum = (sc.ticketId as any)?.ticketNumber || 'UNKNOWN';
      timeline.push({
        id: sc._id.toString(),
        timestamp: sc.scannedAt,
        type: 'scan',
        title: isRejection ? 'Gate Scan Blocked' : 'Gate Check-in Admission',
        description: isRejection 
          ? `Rejected ticket ${tNum}: ${sc.reason}` 
          : `Admitted ticket ${tNum} successfully.`,
        value: sc.result === 'admitted' ? 'Valid' : 'Blocked',
        severity: sc.result === 'rejected_unknown' ? 'critical' : isRejection ? 'high' : 'low',
        meta: {
          result: sc.result,
          ticketNumber: tNum,
          gateId: sc.gateId,
        }
      });
    });

    // Gather logins/other audits
    const logs = await AuditLogModel.find({ performedBy: user._id, action: { $regex: /login|logout/ } })
      .sort({ timestamp: -1 })
      .limit(20);

    logs.forEach(l => {
      timeline.push({
        id: l._id.toString(),
        timestamp: l.timestamp,
        type: 'system',
        title: l.action === 'user.login' ? 'Auth Login Successful' : 'Auth Logout Successful',
        description: `Staff member authenticated from IP ${l.ipAddress || 'unknown'}`,
        value: 'System',
        severity: 'low',
        meta: {
          action: l.action,
        }
      });
    });

    return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 100);
  }
};
