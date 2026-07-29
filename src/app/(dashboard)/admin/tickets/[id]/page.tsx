'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Ticket,
  Ban,
  Printer,
  QrCode,
  Calendar,
  User,
  CreditCard,
  Shield,
  Clock,
  Hash,
  MapPin,
  Phone,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/providers/toast-provider';
import { QRDisplay } from '@/components/shared/qr-display';
import type { Ticket as TicketType } from '@/types/ticket.types';
import type { BadgeVariant } from '@/types/ui.types';

const statusVariant: Record<string, BadgeVariant> = {
  valid: 'success',
  used: 'info',
  cancelled: 'error',
  expired: 'warning',
};

const statusIcon: Record<string, React.ReactNode> = {
  valid: <CheckCircle2 size={14} />,
  used: <QrCode size={14} />,
  cancelled: <XCircle size={14} />,
  expired: <AlertTriangle size={14} />,
};

function formatPrice(paise: number): string {
  if (paise === 0) return 'Free';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();

  const [ticket, setTicket] = React.useState<TicketType | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);

  // Fetch ticket detail
  React.useEffect(() => {
    async function loadTicket() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/tickets/${id}`);
        if (!res.ok) throw new Error('Failed to load ticket');
        const body = await res.json();
        if (body.success) {
          setTicket(body.data);
        }
      } catch (err: any) {
        addToast({ type: 'error', title: 'Error loading ticket', message: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    if (id) loadTicket();
  }, [id, addToast]);

  // Generate QR code image from payload
  React.useEffect(() => {
    async function generateQr() {
      if (!ticket?.qrPayload || ticket.status === 'cancelled') return;
      try {
        // Use the qrcode library via a dynamic import to render client-side
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(ticket.qrPayload, {
          width: 320,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
          errorCorrectionLevel: 'H',
        });
        setQrDataUrl(url);
      } catch {
        // Fallback — show payload text
      }
    }
    generateQr();
  }, [ticket]);

  const handleCancel = async () => {
    if (!ticket) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to cancel ticket');
      }
      setTicket(body.data.ticket);
      setShowCancelModal(false);
      addToast({ type: 'success', title: 'Ticket cancelled', message: `${ticket.ticketNumber} has been voided.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Cancellation failed', message: err.message });
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-500 mb-4">
          <Ticket size={28} />
        </div>
        <h2 className="text-lg font-bold text-gray-200">Ticket Not Found</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-sm">The ticket you're looking for doesn't exist or has been removed.</p>
        <Button variant="secondary" onClick={() => router.push('/admin/tickets')} className="mt-4">
          Back to Tickets
        </Button>
      </div>
    );
  }

  const exhibition = ticket.exhibitionId as any;
  const soldBy = ticket.soldBy as any;

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-accent-400 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Tickets</span>
        </Link>

        {/* Ticket header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
              <Ticket size={22} className="text-accent-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-gray-50 font-mono">
                  {ticket.ticketNumber}
                </h1>
                <Badge variant={statusVariant[ticket.status] || 'default'} className="flex items-center gap-1">
                  {statusIcon[ticket.status]}
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </Badge>
              </div>
              <p className="text-sm text-gray-400 mt-0.5 capitalize">
                {ticket.ticketType} — {formatPrice(ticket.price)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button variant="secondary" size="sm" onClick={handlePrint} leftIcon={<Printer size={14} />}>
              Print
            </Button>
            {ticket.status === 'valid' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                leftIcon={<Ban size={14} />}
              >
                Cancel Ticket
              </Button>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code Card (left on large screens) */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode size={14} className="text-accent-400" />
                  Ticket QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {ticket.status === 'cancelled' ? (
                  <div className="w-full aspect-square rounded-xl bg-gray-800/50 border border-error/20 flex flex-col items-center justify-center text-center p-6">
                    <XCircle size={48} className="text-error/40 mb-3" />
                    <p className="text-sm font-semibold text-error">Ticket Cancelled</p>
                    <p className="text-xs text-gray-500 mt-1">This QR code is no longer valid</p>
                  </div>
                ) : qrDataUrl ? (
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-white p-3 border border-gray-700/30 shadow-lg shadow-accent-500/5 print:shadow-none print:border-2 print:border-black">
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ticket ${ticket.ticketNumber}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-gray-800/50 border border-gray-700/30 flex items-center justify-center">
                    <Spinner size="md" className="text-accent-500" />
                  </div>
                )}

                {/* Print-only ticket footer */}
                <div className="hidden print:block w-full text-center border-t border-gray-200 pt-3 mt-2">
                  <p className="text-lg font-bold font-mono">{ticket.ticketNumber}</p>
                  <p className="text-sm mt-0.5">{ticket.ticketType} — {formatPrice(ticket.price)}</p>
                  {exhibition?.name && <p className="text-xs text-gray-500 mt-1">{exhibition.name}</p>}
                </div>

                {/* Ticket number below QR */}
                <div className="text-center print:hidden">
                  <p className="font-mono text-sm font-bold text-accent-400 tracking-wide">{ticket.ticketNumber}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Scan at gate for entry</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail Cards */}
          <div className="lg:col-span-2 space-y-6 print:hidden">
            {/* Exhibition Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar size={14} className="text-accent-400" />
                  Exhibition Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Exhibition" value={exhibition?.name || '—'} />
                  <DetailItem label="Venue" value={exhibition?.venue || '—'} icon={<MapPin size={12} />} />
                  <DetailItem label="Start Date" value={exhibition?.startDate ? formatDate(exhibition.startDate) : '—'} />
                  <DetailItem label="End Date" value={exhibition?.endDate ? formatDate(exhibition.endDate) : '—'} />
                </div>
              </CardContent>
            </Card>

            {/* Transaction Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard size={14} className="text-accent-400" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Price" value={formatPrice(ticket.price)} />
                  <DetailItem label="Payment Method" value={ticket.paymentMethod?.toUpperCase() || '—'} />
                  <DetailItem label="Payment Status" value={ticket.paymentStatus || '—'} />
                  <DetailItem
                    label="Transaction ID"
                    value={(ticket.metadata as any)?.transactionId || '—'}
                    mono
                  />
                  {(ticket.metadata as any)?.upiTransactionRef && (
                    <DetailItem label="UPI Reference" value={(ticket.metadata as any).upiTransactionRef} mono />
                  )}
                  <DetailItem label="Source" value={ticket.source || '—'} />
                </div>
              </CardContent>
            </Card>

            {/* Customer & Staff Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User size={14} className="text-accent-400" />
                  Customer & Staff Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Customer Name" value={ticket.customerName || '—'} />
                  <DetailItem label="Customer Phone" value={ticket.customerPhone || '—'} icon={<Phone size={12} />} />
                  <DetailItem label="Sold By" value={soldBy?.name || '—'} />
                  <DetailItem label="Staff ID" value={soldBy?.staffId || '—'} mono />
                  <DetailItem label="Sold At" value={ticket.soldAt ? formatDate(ticket.soldAt) : '—'} icon={<Clock size={12} />} />
                  <DetailItem label="Scan Count" value={String(ticket.scanCount || 0)} />
                  {ticket.usedAt && (
                    <DetailItem label="Used At" value={formatDate(ticket.usedAt)} icon={<Clock size={12} />} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield size={14} className="text-accent-400" />
                  Security & Integrity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <DetailItem label="QR Hash" value={ticket.qrHash || '—'} mono className="break-all" />
                  <DetailItem label="Created At" value={ticket.createdAt ? formatDate(ticket.createdAt) : '—'} />
                  {ticket.updatedAt && (
                    <DetailItem label="Updated At" value={formatDate(ticket.updatedAt)} />
                  )}
                  {(ticket.metadata as any)?.notes && (
                    <DetailItem label="Admin Notes" value={(ticket.metadata as any).notes} icon={<FileText size={12} />} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Ticket"
        description="Are you sure you want to cancel this ticket? This action cannot be undone."
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-error/5 border border-error/20 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-error shrink-0" />
              <div>
                <p className="text-sm font-semibold text-error">This will void the ticket permanently</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ticket <span className="font-mono text-gray-300">{ticket.ticketNumber}</span> will be marked as cancelled.
                  It will no longer be scannable at the gate.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setShowCancelModal(false)}>
              Keep Ticket
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isCancelling}
              onClick={handleCancel}
              leftIcon={<Ban size={14} />}
            >
              Yes, Cancel Ticket
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dedicated Print Only Container */}
      <div className="hidden print:block printable-area">
        <QRDisplay
          ticketNumber={ticket.ticketNumber}
          qrPayload={ticket.qrPayload}
          qrDataUrl={qrDataUrl || undefined}
          ticketType={ticket.ticketType}
          price={ticket.price}
          quantity={ticket.quantity || 1}
          usedCount={ticket.usedCount || 0}
          remainingCount={ticket.remainingCount ?? (ticket.quantity || 1)}
          exhibitionName={exhibition?.name || 'Exhibition'}
        />
      </div>
    </>
  );
}

/** Reusable detail item */
function DetailItem({
  label,
  value,
  icon,
  mono,
  className = '',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`text-sm text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </p>
    </div>
  );
}
