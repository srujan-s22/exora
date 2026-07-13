import * as React from 'react';
import { Calendar, Ticket, User, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { StatusIndicator } from './status-indicator';

export interface TicketCardProps {
  ticketNumber: string;
  exhibitionName: string;
  ticketType: string;
  price: number;
  soldAt: Date;
  status: string;
  customerName?: string;
  className?: string;
}

export function TicketCard({
  ticketNumber,
  exhibitionName,
  ticketType,
  price,
  soldAt,
  status,
  customerName,
  className = '',
}: TicketCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price / 100);

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(soldAt));

  return (
    <Card className={`overflow-hidden hover:border-gray-650 transition-all ${className}`}>
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Ticket Header & Name */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 border border-gray-700/60 text-accent-400">
            <Ticket size={20} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-50">{ticketNumber}</span>
              <StatusIndicator status={status} />
            </div>
            <h4 className="text-sm font-semibold text-gray-200">{exhibitionName}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-medium">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} />
                <span>{formattedDate}</span>
              </span>
              {customerName && (
                <span className="inline-flex items-center gap-1">
                  <User size={12} />
                  <span>{customerName}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pricing / Class details (Right) */}
        <div className="flex flex-row md:flex-col md:items-end justify-between items-center gap-2 pt-4 border-t border-gray-850 md:pt-0 md:border-0 shrink-0">
          <div className="space-y-0.5 md:text-right">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Price Paid</span>
            <span className="text-base font-extrabold text-accent-300">{formattedPrice}</span>
          </div>
          <Badge variant="accent" className="capitalize select-none font-bold">
            {ticketType}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
