import type { Ticket } from './ticket.types';
import type { Sale } from './sale.types';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FraudOverview {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  duplicateScans: number;
  wrongExhibitionScans: number;
  forgedAttempts: number;
  activeAlertsCount: number;
}

export interface SuspiciousIncident {
  id: string;
  ticketNumber?: string;
  exhibitionName: string;
  exhibitionId: string;
  scannedBy: {
    name: string;
    staffId: string;
  } | null;
  scannedAt: Date;
  result: string;
  reason: string;
  gateId?: string;
}

export interface ReconciliationRow {
  exhibitionId: string;
  exhibitionName: string;
  status: string;
  ticketsSold: number;
  ticketsScanned: number;
  mismatchCount: number; // ticketsScanned - ticketsSold
  expectedRevenue: number; // ticketsSold * ticketConfigPrice
  collectedRevenue: number; // total from sales
  revenueMismatch: number; // collectedRevenue - expectedRevenue
}

export interface StaffRiskProfile {
  staffId: string;
  name: string;
  role: 'admin' | 'counter' | 'gate';
  totalTransactions: number; // sales for counter, scans for gate
  invalidCount: number;
  duplicateCount: number;
  forgeryCount: number;
  mismatchCount: number; // only applicable for mismatched sales
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  reason: string;
}

export interface ExhibitionRiskProfile {
  exhibitionId: string;
  name: string;
  status: string;
  ticketsIssued: number;
  validEntries: number;
  invalidScans: number;
  duplicateScans: number;
  forgeryScans: number;
  mismatchCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  reason: string;
}

export interface TicketForensics {
  ticket: Ticket;
  sale: Sale | null;
  scans: Array<{
    id: string;
    scannedAt: Date;
    scannedByName: string;
    scannedByStaffId: string;
    result: string;
    reason: string;
    gateId?: string;
  }>;
  auditLogs: Array<{
    id: string;
    timestamp: Date;
    action: string;
    performedByName: string;
    details: string;
  }>;
}
