import type { TicketStatus, PaymentMethod, ScanResult } from '@/lib/utils/constants';

export interface Ticket {
  id: string;
  ticketNumber: string;
  exhibitionId: string;
  ticketType: string;
  price: number;
  qrPayload: string;
  qrHash: string;
  status: TicketStatus | 'partially_used';
  scanCount: number;
  quantity: number;
  usedCount: number;
  remainingCount: number;
  soldBy: string;
  soldAt: Date;
  usedAt?: Date;
  usedBy?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'free';
  source: 'admin' | 'counter';
  createdBy?: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateTicketInput {
  exhibitionId: string;
  ticketType: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  upiTransactionRef?: string;
  cashReceived?: number;
  changeGiven?: number;
  notes?: string;
}

export interface ValidateTicketInput {
  qrPayload: string;
  exhibitionId: string;
  gateId?: string;
  countToAdmit?: number;
}

export interface TicketValidationResult {
  valid: boolean;
  result: ScanResult;
  ticket?: Ticket;
  message: string;
  quantity?: number;
  usedCount?: number;
  remainingCount?: number;
  admittedThisScan?: number;
}

export interface TicketScan {
  id: string;
  ticketId?: string;
  exhibitionId: string;
  scannedBy: string;
  scannedAt: Date;
  result: ScanResult;
  deviceInfo?: string;
  gateId?: string;
  location?: {
    lat: number;
    lng: number;
  };
  reason?: string;
  ticketStatusBefore?: string;
  ticketStatusAfter?: string;
  admittedCount?: number;
  previousUsedCount?: number;
  newUsedCount?: number;
  previousRemainingCount?: number;
  newRemainingCount?: number;
}
