import * as React from 'react';
import { Calendar, MapPin, Ticket, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '../ui/card';
import { StatusIndicator } from './status-indicator';
import type { ITicketType } from '@/lib/db/models/exhibition.model';

export interface ExhibitionCardProps {
  id: string;
  name: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  status: string;
  ticketTypes: ITicketType[];
  ticketCount?: number;
  revenue?: number;
}

export function ExhibitionCard({
  id,
  name,
  venue,
  startDate,
  endDate,
  status,
  ticketTypes,
  ticketCount = 0,
  revenue = 0,
}: ExhibitionCardProps) {
  const formattedDates = () => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const format = { month: 'short', day: 'numeric' } as const;
    return `${s.toLocaleDateString('en-IN', format)} - ${e.toLocaleDateString('en-IN', { ...format, year: 'numeric' })}`;
  };

  const getPriceRange = () => {
    if (ticketTypes.length === 0) return 'Free';
    const prices = ticketTypes.map((t) => t.price / 100);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `₹${min}`;
    return `₹${min} - ₹${max}`;
  };

  const formattedRevenue = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(revenue / 100);

  return (
    <Card className="overflow-hidden group hover:border-gray-650 transition-all">
      <CardContent className="p-0">
        <Link href={`/admin/exhibitions/${id}`} className="block p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-gray-50 group-hover:text-accent-300 transition-colors">
                {name}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <MapPin size={12} className="text-gray-500 shrink-0" />
                <span className="truncate max-w-[180px]">{venue}</span>
              </div>
            </div>
            <StatusIndicator status={status} className="shrink-0 select-none" />
          </div>

          {/* Timeframe schedule */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <Calendar size={13} className="text-accent-400 shrink-0" />
            <span>{formattedDates()}</span>
          </div>

          {/* Dash line */}
          <div className="border-t border-gray-850" />

          {/* Mini-metrics row */}
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">Tickets Sold</span>
                <span className="text-sm font-bold text-gray-200">{ticketCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">Revenue</span>
                <span className="text-sm font-bold text-accent-300">{formattedRevenue}</span>
              </div>
            </div>
            
            {/* Hover arrow indicator */}
            <div className="text-gray-500 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all pl-2">
              <ChevronRight size={18} />
            </div>
          </div>

        </Link>
      </CardContent>
    </Card>
  );
}
