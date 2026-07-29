'use client';

import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PaymentBadge } from '@/components/shared/payment-badge';
import { Modal } from '@/components/ui/modal';
import { QRDisplay } from '@/components/shared/qr-display';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { Printer, RefreshCw } from 'lucide-react';

interface CancelTransactionButtonProps {
  row: any;
  saleType: 'general' | 'ride';
  onCancelled: () => void;
}

function CancelTransactionButton({ row, saleType, onCancelled }: CancelTransactionButtonProps) {
  const { addToast } = useToast();
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const windowSeconds = row.cancellationWindowSeconds || 30;
  const soldAtTime = new Date(row.soldAt).getTime();

  React.useEffect(() => {
    if (row.status === 'cancelled') {
      return;
    }

    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - soldAtTime) / 1000);
      const remaining = windowSeconds - elapsed;
      return Math.max(0, remaining);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [soldAtTime, windowSeconds, row.status]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      addToast({
        type: 'warning',
        title: 'Reason Required',
        message: 'Please select a reason.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = saleType === 'ride' 
        ? `/api/rides/sales/${row.id}/cancel` 
        : `/api/sales/${row.id}/cancel`;
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        addToast({
          type: 'success',
          title: 'Transaction Cancelled',
          message: 'The transaction has been successfully cancelled.',
        });
        setShowConfirmModal(false);
        onCancelled();
      } else {
        addToast({
          type: 'error',
          title: 'Cancellation Failed',
          message: body.error?.message || 'Failed to cancel.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not connect to the server.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (row.status === 'cancelled') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-error/15 text-error">
        Voided
      </span>
    );
  }

  if (timeLeft <= 0) {
    return (
      <span className="text-xs text-gray-500 font-semibold select-none">
        Locked
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1 items-start">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            setReason('');
            setShowConfirmModal(true);
          }}
          className="text-[10px] py-1 px-2.5 font-bold uppercase tracking-wider bg-error hover:bg-error/95"
        >
          Cancel Sale
        </Button>
        <span className="text-[10px] font-mono text-warning-400 select-none animate-pulse">
          Void (00:{timeLeft.toString().padStart(2, '0')})
        </span>
      </div>

      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Void Transaction"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div className="text-sm text-gray-300 space-y-2">
            <p>Are you sure you want to void transaction <span className="font-mono text-gray-150 font-bold">{row.transactionId}</span>?</p>
            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Total Amount:</span>
                <span className="font-bold text-gray-200">₹{row.totalAmount / 100}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Quantity:</span>
                <span className="font-bold text-gray-200">{row.ticketCount} tickets</span>
              </div>
            </div>
            <p className="text-xs text-error font-medium">This action cannot be undone. All tickets will be soft-deleted/cancelled.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Cancellation Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-500"
            >
              <option value="">-- Select a reason --</option>
              <option value="Issued 4 instead of 3">Issued 4 instead of 3</option>
              <option value="Wrong ticket quantity">Wrong ticket quantity</option>
              <option value="Duplicate transaction">Duplicate transaction</option>
              <option value="Other">Other / Typo correction</option>
            </select>

            {reason === 'Other' && (
              <Input
                placeholder="Enter custom cancellation notes..."
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 text-sm"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-850">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={submitting}
              disabled={!reason}
            >
              Confirm Void
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default function SalesHistoryPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const router = useRouter();

  const canViewEntry = hasPermission('canViewEntrySales');
  const canViewRide = hasPermission('canViewRideSales');
  const canCancelEntry = hasPermission('canCancelEntryTickets');
  const canCancelRide = hasPermission('canCancelRideTickets');
  const canReprintEntry = hasPermission('canReprintEntryTickets');
  const canReprintRide = hasPermission('canReprintRideTickets');

  // Pagination & Filters State
  const [sales, setSales] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);
  const [saleType, setSaleType] = React.useState<'general' | 'ride'>('general');
  
  const [exhibitions, setExhibitions] = React.useState<any[]>([]);
  const [exhibitionId, setExhibitionId] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('');

  // Auto-select initial permitted tab
  React.useEffect(() => {
    if (!canViewEntry && canViewRide) {
      setSaleType('ride');
    } else if (canViewEntry && !canViewRide) {
      setSaleType('general');
    }
  }, [canViewEntry, canViewRide]);

  // Reprint State
  const [reprintLoadingId, setReprintLoadingId] = React.useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = React.useState(false);
  const [createdTickets, setCreatedTickets] = React.useState<any[]>([]);
  const [createdQrDataUrls, setCreatedQrDataUrls] = React.useState<string[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = React.useState(0);
  const [activeExhibitionName, setActiveExhibitionName] = React.useState('');

  // Auth role gating
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'counter' && user.role !== 'admin' && user.role !== 'super_admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Load exhibitions for filter dropdown
  const loadExhibitions = React.useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/counter');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setExhibitions(body.data.activeExhibitions || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load sales history
  const loadSalesHistory = React.useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (exhibitionId) queryParams.append('exhibitionId', exhibitionId);
      if (paymentMethod) queryParams.append('paymentMethod', paymentMethod);

      const endpoint = saleType === 'ride' ? '/api/rides/sales' : '/api/sales';
      const res = await fetch(`${endpoint}?${queryParams.toString()}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setSales(body.data.data || []);
          setTotalPages(body.data.pagination.totalPages || 1);
          setTotalItems(body.data.pagination.total || 0);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error Loading History',
          message: 'Failed to fetch sales history logs.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Could not connect to server.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, exhibitionId, paymentMethod, saleType, addToast]);

  React.useEffect(() => {
    if (user && (user.role === 'counter' || user.role === 'admin')) {
      loadExhibitions();
      loadSalesHistory();
    }
  }, [user, page, exhibitionId, paymentMethod, saleType, loadExhibitions, loadSalesHistory]);

  const handleReprint = async (sale: any) => {
    if (!sale.tickets || sale.tickets.length === 0) {
      addToast({
        type: 'warning',
        title: 'Empty Tickets',
        message: 'No tickets linked to this sale record.',
      });
      return;
    }

    setReprintLoadingId(sale.id);
    setActiveExhibitionName(sale.exhibitionId?.name || 'Exhibition');

    try {
      // Fetch dynamic QRs for all tickets in parallel
      const promises = sale.tickets.map((t: any) => {
        const tId = typeof t === 'string' ? t : (t._id || t.id);
        return fetch(`/api/tickets/${tId}`).then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        });
      });

      const responses = await Promise.all(promises);
      const tickets = responses.filter((r) => r.success).map((r) => r.data);

      if (tickets.length > 0) {
        setCreatedTickets(tickets);
        setCreatedQrDataUrls(tickets.map((t) => t.qrDataUrl));
        setCurrentTicketIndex(0);
        setShowPrintModal(true);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Reprint Failed',
        message: 'Failed to retrieve ticket payloads for reprint.',
      });
    } finally {
      setReprintLoadingId(null);
    }
  };

  const columns = [
    { key: 'transactionId', label: 'Transaction ID', className: 'font-mono font-bold' },
    {
      key: 'exhibitionId',
      label: 'Exhibition',
      render: (exh: any) => <span>{exh?.name || 'Exhibition'}</span>,
      className: 'max-w-[200px] truncate',
    },
    {
      key: 'ticketType',
      label: 'Class',
      render: (v: any, row: any) => {
        if (row.rideId) {
          return <span className="font-semibold text-accent-300">{row.rideId.name || 'Ride'}</span>;
        }
        return <span className="capitalize font-semibold text-gray-300">{v || 'General'}</span>;
      },
    },
    {
      key: 'ticketCount',
      label: 'Qty',
      render: (v: any) => <span className="font-mono text-gray-400">{v}</span>,
    },
    {
      key: 'totalAmount',
      label: 'Amount Paid',
      render: (v: any) => <span className="font-extrabold text-accent-300">₹{v / 100}</span>,
    },
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (v: any) => <PaymentBadge method={v} />,
    },
    {
      key: 'soldAt',
      label: 'Sold Date',
      render: (v: any) => (
        <span className="font-mono text-gray-400">
          {new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(v))}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status / Void',
      render: (_v: any, row: any) => {
        const canCancelThis = saleType === 'ride' ? canCancelRide : canCancelEntry;
        if (!canCancelThis && row.status !== 'cancelled') {
          return <span className="text-xs text-gray-500 font-medium">Restricted</span>;
        }
        return (
          <CancelTransactionButton
            row={row}
            saleType={saleType}
            onCancelled={loadSalesHistory}
          />
        );
      },
    },
    {
      key: 'actions',
      label: 'Reprint',
      render: (_v: any, row: any) => {
        const canReprintThis = saleType === 'ride' ? canReprintRide : canReprintEntry;
        if (!canReprintThis) {
          return <span className="text-xs text-gray-500 font-medium">Restricted</span>;
        }
        return (
          <Button
            variant="secondary"
            size="sm"
            disabled={row.status === 'cancelled'}
            onClick={() => handleReprint(row)}
            isLoading={reprintLoadingId === row.id}
            leftIcon={<Printer size={12} />}
          >
            {row.status === 'cancelled' ? 'Voided' : 'Reprint'}
          </Button>
        );
      },
    },
  ];

  if (authLoading) {
    return (
      <ContentWrapper>
        <div className="flex h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <PageHeader
        title="Sales History Logs"
        description="View past sales transactions and print duplicate receipts."
        showDivider
      />

      {/* Sales Category Tabs */}
      {!canViewEntry && !canViewRide ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400 mb-6">
          You do not have permission to view entry or ride sales history logs.
        </div>
      ) : (
        <div className="flex border-b border-gray-850 mb-6 gap-2 select-none">
          {canViewEntry && (
            <button
              onClick={() => {
                setSaleType('general');
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                saleType === 'general'
                  ? 'border-accent-500 text-accent-300 font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              General Ticket Sales
            </button>
          )}
          {canViewRide && (
            <button
              onClick={() => {
                setSaleType('ride');
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                saleType === 'ride'
                  ? 'border-accent-500 text-accent-300 font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Ride Ticket Sales
            </button>
          )}
        </div>
      )}

      {/* Filter and search toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-900 border border-gray-800 p-4 rounded-xl items-end">
        <div className="w-full md:w-1/3">
          <Select
            label="Filter by Exhibition"
            value={exhibitionId}
            onChange={(e) => {
              setExhibitionId(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Exhibitions', value: '' },
              ...exhibitions.map((e) => ({ label: e.name, value: e.id })),
            ]}
          />
        </div>
        <div className="w-full md:w-1/4">
          <Select
            label="Payment Mode"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Payments', value: '' },
              { label: 'Cash Only', value: 'cash' },
              { label: 'UPI Only', value: 'upi' },
            ]}
          />
        </div>
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={loadSalesHistory}
          leftIcon={<RefreshCw size={14} />}
          isLoading={loading}
        >
          Refresh Logs
        </Button>
      </div>

      {/* History table */}
      {loading ? (
        <div className="flex h-[30dvh] items-center justify-center bg-gray-900 border border-gray-800 rounded-xl p-8">
          <Spinner className="text-accent-500" />
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center bg-gray-900 border border-gray-800 rounded-xl p-12">
          <p className="text-gray-400">No sale transactions matching filters found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable columns={columns} data={sales} />
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-850 pt-4">
              <span className="text-xs text-gray-400">
                Showing Page {page} of {totalPages} ({totalItems} total transactions)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reprint Modal */}
      {createdTickets.length > 0 && (
        <Modal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="POS Thermal Reprint Voucher"
          description="Send to POS thermal printer or show the customer to scan the QR."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowPrintModal(false)}>
                Close Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.print();
                  setShowPrintModal(false);
                }}
                leftIcon={<Printer size={14} />}
              >
                Send to Printer
              </Button>
            </>
          }
        >
          <div className="py-2.5">
            {/* Carousel navigation for batch tickets */}
            {createdTickets.length > 1 && (
              <div className="flex items-center justify-between mb-4 bg-gray-850 p-2 rounded-lg print:hidden">
                <span className="text-xs font-semibold text-gray-300">
                  Ticket {currentTicketIndex + 1} of {createdTickets.length}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentTicketIndex === 0}
                    onClick={() => setCurrentTicketIndex((prev) => prev - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentTicketIndex === createdTickets.length - 1}
                    onClick={() => setCurrentTicketIndex((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Interactive Screen Display (Renders active index) */}
            <div className="print:hidden">
              <QRDisplay
                ticketNumber={createdTickets[currentTicketIndex]?.ticketNumber}
                qrPayload={createdTickets[currentTicketIndex]?.qrPayload || ''}
                qrDataUrl={createdQrDataUrls[currentTicketIndex]}
                ticketType={
                  createdTickets[currentTicketIndex]?.ticketType === 'ride'
                    ? (createdTickets[currentTicketIndex]?.rideId?.name || 'Ride')
                    : (createdTickets[currentTicketIndex]?.ticketType || 'General')
                }
                price={(createdTickets[currentTicketIndex]?.price || 0) * (createdTickets[currentTicketIndex]?.quantity || 1)}
                quantity={createdTickets[currentTicketIndex]?.quantity || 1}
                usedCount={createdTickets[currentTicketIndex]?.usedCount || 0}
                remainingCount={createdTickets[currentTicketIndex]?.remainingCount ?? (createdTickets[currentTicketIndex]?.quantity || 1)}
                exhibitionName={activeExhibitionName}
              />
            </div>

            {/* Print Only Layout (Renders ALL tickets in the batch) */}
            <div className="hidden print:block printable-area">
              {createdTickets.map((ticket, idx) => (
                <div key={ticket.id} className={`printable-ticket-card ${idx < createdTickets.length - 1 ? 'page-break-after-always' : ''}`}>
                  <QRDisplay
                    ticketNumber={ticket.ticketNumber}
                    qrPayload={ticket.qrPayload || ''}
                    qrDataUrl={createdQrDataUrls[idx]}
                    ticketType={
                      ticket.ticketType === 'ride'
                        ? (ticket.rideId?.name || 'Ride')
                        : (ticket.ticketType || 'General')
                    }
                    price={(ticket.price || 0) * (ticket.quantity || 1)}
                    quantity={ticket.quantity || 1}
                    usedCount={ticket.usedCount || 0}
                    remainingCount={ticket.remainingCount ?? (ticket.quantity || 1)}
                    exhibitionName={activeExhibitionName}
                  />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </ContentWrapper>
  );
}
