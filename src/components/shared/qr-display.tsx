import * as React from 'react';
import { Copy, Check, Ticket as TicketIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export interface QRDisplayProps {
  ticketNumber: string;
  qrPayload: string;
  ticketType: string;
  price: number;
  exhibitionName: string;
  qrDataUrl?: string; // Optional real QR code image
  quantity?: number;
  usedCount?: number;
  remainingCount?: number;
}

export function QRDisplay({
  ticketNumber,
  qrPayload,
  ticketType,
  price,
  exhibitionName,
  qrDataUrl,
  quantity = 1,
  usedCount = 0,
  remainingCount,
}: QRDisplayProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calculatedRemaining = remainingCount ?? Math.max(0, quantity - usedCount);

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price / 100);

  return (
    <div id="printable-receipt" className="w-full max-w-sm mx-auto">
      <Card className="w-full overflow-hidden bg-gray-900 border border-gray-800 shadow-lg relative rounded-xl">
        {/* Decorative side ticket notches */}
        <div className="absolute left-0 top-[60%] -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-950 border border-gray-800 z-10 print:hidden" />
        <div className="absolute right-0 top-[60%] translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-950 border border-gray-800 z-10 print:hidden" />

        <CardContent className="p-6 flex flex-col items-center">
          {/* Ticket Brand Info */}
          <div className="w-full text-center space-y-1 mb-4">
            <span className="text-[10px] font-bold text-accent-400 uppercase tracking-widest print:text-gray-800 flex items-center justify-center gap-1">
              <TicketIcon size={12} />
              <span>Ticket Pass</span>
            </span>
            <h4 className="text-base font-bold text-gray-50 truncate px-2 print:text-black">{exhibitionName}</h4>
            <p className="text-xs text-gray-500 font-mono print:text-gray-800">{ticketNumber}</p>
          </div>

          {/* QR Core Container */}
          <div className="relative p-5 bg-white rounded-xl shadow-md border border-gray-200/50 mb-3 flex items-center justify-center print:border-none print:shadow-none">
            {qrDataUrl ? (
              <img src={qrDataUrl} className="h-44 w-44 object-contain select-none" alt="Ticket QR Code" />
            ) : (
              /* Simulated QR Code */
              <svg className="h-44 w-44 text-gray-950" viewBox="0 0 100 100" fill="currentColor">
                <path d="M0,0 h30 v10 h-20 v20 h-10 z M0,10 h10 v10 h-10 z M10,0 h10 v10 h-10 z" />
                <path d="M70,0 h30 v30 h-10 v-20 h-20 z M80,10 h10 v10 h-10 z M90,0 h10 v10 h-10 z" />
                <path d="M0,70 h10 v20 h20 v10 h-30 z M0,80 h10 v10 h-10 z M10,90 h10 v10 h-10 z" />
                <path d="M90,70 h10 v30 h-30 v-10 h20 z M80,80 h10 v10 h-10 z M90,90 h10 v10 h-10 z" />
                <path d="M40,10 h10 v10 h-10 z M55,15 h10 v5 h-10 z M45,30 h15 v10 h-15 z M15,45 h10 v20 h-10 z M35,45 h20 v10 h-20 z M75,45 h15 v10 h-15 z M60,60 h10 v15 h-10 z M40,75 h15 v10 h-15 z M75,75 h15 v15 h-15 z M25,85 h10 v5 h-10 z" />
                <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="47" y="47" width="6" height="6" />
              </svg>
            )}
          </div>

          {/* Prominent Quantity Label Below QR */}
          <div className="w-full text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-500/10 border border-accent-500/20 rounded-lg print:border-gray-400 print:bg-gray-100">
              <span className="text-xs font-black text-accent-400 uppercase tracking-wide print:text-black">
                Tickets: {quantity}
              </span>
              <span className="text-xs text-gray-500 print:text-black">•</span>
              <span className="text-xs font-black text-gray-200 uppercase tracking-wide print:text-black">
                Remaining: {calculatedRemaining}
              </span>
            </div>
          </div>

          {/* Dash Line Divider */}
          <div className="w-full flex items-center justify-between mb-4 select-none text-gray-800">
            <div className="h-[1px] flex-1 border-t border-dashed border-gray-700 print:border-gray-300" />
          </div>

          {/* Ticket Details Grid */}
          <div className="w-full grid grid-cols-2 gap-4 mb-4 px-1 text-left">
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block print:text-gray-600">Ticket Type</span>
              <span className="text-sm font-bold text-gray-200 capitalize print:text-black">{ticketType}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block print:text-gray-600">Price Paid</span>
              <span className="text-sm font-bold text-accent-300 print:text-black">{formattedPrice}</span>
            </div>
          </div>

          {/* Action button copy payload */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            className="w-full text-xs font-semibold print:hidden"
          >
            {copied ? 'Signed Payload Copied!' : 'Copy Ticket Payload'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
