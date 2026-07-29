import * as React from 'react';
import { Copy, Check, Ticket as TicketIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

import type { IPrintConfig } from '@/lib/db/models/system-settings.model';

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
  printConfig?: IPrintConfig;
}

const DEFAULT_PRINT: IPrintConfig = {
  paperType: 'thermal_80mm',
  layoutMode: 'thermal',
  paperWidth: 80,
  paperHeight: 0,
  unit: 'mm',
  orientation: 'portrait',
  marginTop: 2,
  marginRight: 2,
  marginBottom: 2,
  marginLeft: 2,
  ticketPadding: 4,
  qrSize: 48,
  fontScale: 1.0,
  showLogo: true,
  showFooter: true,
  compactMode: true,
};

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
  printConfig: customPrintConfig,
}: QRDisplayProps) {
  const [copied, setCopied] = React.useState(false);
  const [fetchedConfig, setFetchedConfig] = React.useState<IPrintConfig | null>(null);

  React.useEffect(() => {
    if (!customPrintConfig) {
      fetch('/api/print-config')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.data) {
            setFetchedConfig(data.data);
          }
        })
        .catch(() => {});
    }
  }, [customPrintConfig]);

  const cfg = customPrintConfig || fetchedConfig || DEFAULT_PRINT;

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

  const isA4 = cfg.paperType === 'a4' || cfg.layoutMode === 'a4' || (cfg.paperWidth || 80) >= 150;
  const unit = cfg.unit || 'mm';
  const paperCssWidth = isA4 ? '210mm' : `${cfg.paperWidth || 80}${unit}`;
  const paperCssHeight = isA4 ? '297mm' : (cfg.paperHeight > 0 ? `${cfg.paperHeight}${unit}` : 'auto');
  const marginCss = `${cfg.marginTop ?? (isA4 ? 10 : 2)}${unit} ${cfg.marginRight ?? (isA4 ? 10 : 2)}${unit} ${cfg.marginBottom ?? (isA4 ? 10 : 2)}${unit} ${cfg.marginLeft ?? (isA4 ? 10 : 2)}${unit}`;
  const paddingCss = `${cfg.ticketPadding ?? (isA4 ? 8 : 4)}${unit}`;
  const fontScale = cfg.fontScale || 1.0;
  const qrSizeCss = `${cfg.qrSize || (isA4 ? 64 : 48)}${unit}`;
  const printMaxWidth = isA4 ? '160mm' : `${cfg.paperWidth || 80}${unit}`;

  return (
    <div id="printable-receipt" className={`w-full mx-auto ${isA4 ? 'max-w-md' : 'max-w-sm'}`}>
      {/* Dynamic Thermal POS & A4 Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: ${paperCssWidth} ${paperCssHeight};
              margin: ${marginCss};
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-receipt {
              display: block !important;
              visibility: visible !important;
              position: relative !important;
              width: 100% !important;
              max-width: ${printMaxWidth} !important;
              margin: 0 auto !important;
              padding: ${paddingCss} !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              font-size: ${13 * fontScale}px !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            #printable-receipt * {
              color: black !important;
            }
            .printable-qr-img {
              width: ${qrSizeCss} !important;
              height: ${qrSizeCss} !important;
              max-width: 100% !important;
            }
          }
        `
      }} />

      <Card className={`w-full overflow-hidden bg-gray-900 border border-gray-800 shadow-lg relative rounded-xl ${
        isA4 
          ? 'print:border-2 print:border-black print:rounded-xl print:shadow-none print:bg-white' 
          : 'print:border-none print:shadow-none print:bg-white print:rounded-none'
      }`}>
        {/* Decorative side ticket notches */}
        <div className="absolute left-0 top-[60%] -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-950 border border-gray-800 z-10 print:hidden" />
        <div className="absolute right-0 top-[60%] translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-950 border border-gray-800 z-10 print:hidden" />

        <CardContent className={`p-6 flex flex-col items-center ${isA4 ? 'print:p-6' : 'print:p-1'}`}>
          {/* Ticket Brand Info */}
          <div className="w-full text-center space-y-1 mb-4 print:mb-3">
            {cfg.showLogo !== false && (
              <span className="text-[10px] font-bold text-accent-400 uppercase tracking-widest print:text-black print:text-xs flex items-center justify-center gap-1">
                <TicketIcon size={14} />
                <span>EXORA OFFICIAL ENTRY PASS</span>
              </span>
            )}
            <h4 className="text-base font-bold text-gray-50 truncate px-2 print:text-black print:text-lg">{exhibitionName}</h4>
            <p className="text-xs text-gray-500 font-mono print:text-black print:text-xs font-bold">{ticketNumber}</p>
          </div>

          {/* QR Core Container */}
          <div className="relative p-4 bg-white rounded-xl shadow-md border border-gray-200/50 mb-3 flex items-center justify-center print:border-none print:shadow-none print:p-2 print:mb-3">
            {qrDataUrl ? (
              <img src={qrDataUrl} className="h-44 w-44 object-contain select-none printable-qr-img" alt="Ticket QR Code" />
            ) : (
              /* Simulated QR Code */
              <svg className="h-44 w-44 text-gray-950 printable-qr-img" viewBox="0 0 100 100" fill="currentColor">
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
          <div className="w-full text-center mb-3 print:mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-500/10 border border-accent-500/20 rounded-lg print:border-2 print:border-black print:bg-white print:px-4 print:py-2">
              <span className="text-xs font-black text-accent-400 uppercase tracking-wide print:text-black print:text-sm">
                TICKETS: {quantity}
              </span>
              <span className="text-xs text-gray-500 print:text-black">•</span>
              <span className="text-xs font-black text-gray-200 uppercase tracking-wide print:text-black print:text-sm">
                REMAINING: {calculatedRemaining}
              </span>
            </div>
          </div>

          {/* Dash Line Divider */}
          <div className="w-full flex items-center justify-between mb-3 select-none text-gray-800 print:mb-3">
            <div className="h-[1px] flex-1 border-t border-dashed border-gray-700 print:border-black" />
          </div>

          {/* Ticket Details Grid */}
          <div className="w-full grid grid-cols-2 gap-3 mb-3 px-1 text-left print:mb-3">
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block print:text-black print:text-[11px]">Ticket Type</span>
              <span className="text-sm font-bold text-gray-200 capitalize print:text-black print:text-sm">{ticketType}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block print:text-black print:text-[11px]">Price Paid</span>
              <span className="text-sm font-bold text-accent-300 print:text-black print:text-sm">{formattedPrice}</span>
            </div>
          </div>

          {/* Footer Metadata */}
          {cfg.showFooter !== false && (
            <div className="hidden print:block w-full text-center text-[10px] text-black border-t border-black pt-2 mt-2 font-mono font-bold">
              OFFICIAL EXORA ENTRY PASS • PRESENT AT GATE ENTRANCE FOR ENTRY
            </div>
          )}

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
