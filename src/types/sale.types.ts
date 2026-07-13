import type { PaymentMethod } from '@/lib/utils/constants';

export interface Sale {
  id: string;
  transactionId: string;
  exhibitionId: string;
  tickets: string[];
  ticketCount: number;
  totalAmount: number; // in paise
  paymentMethod: PaymentMethod;
  upiTransactionRef?: string;
  soldBy: string;
  soldAt: Date;
  shiftId?: string;
  ticketType?: string;
  unitPrice?: number; // in paise
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentStatus?: 'pending' | 'paid' | 'free';
  cashReceived?: number; // in paise
  changeGiven?: number; // in paise
}

export interface SaleStats {
  totalRevenue: number;
  totalTickets: number;
  cashRevenue: number;
  upiRevenue: number;
  cashTickets: number;
  upiTickets: number;
}
