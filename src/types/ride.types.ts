import { PaymentMethod } from '@/lib/utils/constants';

export interface Ride {
  id: string;
  name: string;
  description?: string;
  price: number; // in paise
  exhibitionId: string;
  assignedStaff: string[]; // User IDs (role: gate)
  status: 'open' | 'closed';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RideTicket {
  id: string;
  ticketNumber: string;
  exhibitionId: string;
  rideId: string;
  ticketType: 'ride';
  price: number; // in paise
  qrPayload: string;
  qrHash: string;
  status: 'valid' | 'used' | 'cancelled';
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid';
  soldBy: string;
  soldAt: Date;
  usedAt?: Date;
  usedBy?: string;
  scanCount: number;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RideScan {
  id: string;
  ticketId?: string;
  rideId: string;
  exhibitionId: string;
  scannedBy: string;
  scannedAt: Date;
  result: 'admitted' | 'rejected_used' | 'rejected_wrong_ride' | 'rejected_invalid' | 'rejected_unknown' | 'rejected_closed';
  qrPayloadRaw: string;
  reason?: string;
  gateId?: string;
}

export interface RideSale {
  id: string;
  transactionId: string;
  exhibitionId: string;
  rideId: string;
  tickets: string[]; // RideTicket IDs
  ticketCount: number;
  totalAmount: number; // in paise
  paymentMethod: PaymentMethod;
  upiTransactionRef?: string;
  soldBy: string;
  soldAt: Date;
  customerName?: string;
  customerPhone?: string;
  cashReceived?: number;
  changeGiven?: number;
  notes?: string;
}

export interface CreateRideInput {
  name: string;
  description?: string;
  price: number; // in paise
  exhibitionId: string;
  assignedStaff?: string[];
  status?: 'open' | 'closed';
  isActive?: boolean;
}

export interface CreateRideTicketInput {
  exhibitionId: string;
  rideId: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  upiTransactionRef?: string;
  cashReceived?: number;
  changeGiven?: number;
  notes?: string;
}

export interface ValidateRideTicketInput {
  qrPayload: string;
  exhibitionId: string;
  rideId: string;
  gateId?: string;
  countToAdmit?: number;
  requestId?: string;
}

export interface RideTicketValidationResult {
  valid: boolean;
  result: RideScan['result'];
  ticket?: RideTicket;
  ride?: Ride;
  message: string;
}

export interface UpdateRideInput {
  name?: string;
  description?: string;
  price?: number; // in paise
  assignedStaff?: string[];
  status?: 'open' | 'closed';
  isActive?: boolean;
}
