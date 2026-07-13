import type { ExhibitionStatus } from '@/lib/utils/constants';

export interface TicketTypeConfig {
  name: string;
  price: number; // in paise
  maxQuantity?: number;
}

export interface ExhibitionSettings {
  allowMultiEntry: boolean;
  maxScansPerTicket: number;
}

export interface Exhibition {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  venue: string;
  address?: string;
  startDate: Date;
  endDate: Date;
  ticketTypes: TicketTypeConfig[];
  status: ExhibitionStatus;
  settings: ExhibitionSettings;
  entryFee: number;
  capacity: number;
  assignedStaffIds?: string[];
  assignedGateIds?: string[];
  active?: boolean;
  archive?: boolean;
  notes?: string;
  images?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  ticketCount?: number;
  revenue?: number;
}

export interface CreateExhibitionInput {
  name: string;
  description?: string;
  category?: string;
  venue: string;
  address?: string;
  startDate: string;
  endDate: string;
  ticketTypes: TicketTypeConfig[];
  settings?: Partial<ExhibitionSettings>;
  entryFee?: number;
  capacity?: number;
  assignedStaffIds?: string[];
  assignedGateIds?: string[];
  notes?: string;
  images?: string[];
}

export interface UpdateExhibitionInput {
  name?: string;
  description?: string;
  category?: string;
  venue?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  ticketTypes?: TicketTypeConfig[];
  status?: ExhibitionStatus;
  settings?: Partial<ExhibitionSettings>;
  entryFee?: number;
  capacity?: number;
  assignedStaffIds?: string[];
  assignedGateIds?: string[];
  active?: boolean;
  archive?: boolean;
  notes?: string;
  images?: string[];
}
