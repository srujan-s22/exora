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

export default function SalesHistoryPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Pagination & Filters State
  const [sales, setSales] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);
  
  const [exhibitions, setExhibitions] = React.useState<any[]>([]);
  const [exhibitionId, setExhibitionId] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('');

  // Reprint State
  const [reprintLoadingId, setReprintLoadingId] = React.useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = React.useState(false);
  const [createdTickets, setCreatedTickets] = React.useState<any[]>([]);
  const [createdQrDataUrls, setCreatedQrDataUrls] = React.useState<string[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = React.useState(0);
  const [activeExhibitionName, setActiveExhibitionName] = React.useState('');

  // Auth role gating
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'counter' && user.role !== 'admin') {
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

      const res = await fetch(`/api/sales?${queryParams.toString()}`);
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
  }, [page, exhibitionId, paymentMethod, addToast]);

  React.useEffect(() => {
    if (user && (user.role === 'counter' || user.role === 'admin')) {
      loadExhibitions();
      loadSalesHistory();
    }
  }, [user, page, exhibitionId, paymentMethod, loadExhibitions, loadSalesHistory]);

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
      const promises = sale.tickets.map((tId: string) =>
        fetch(`/api/tickets/${tId}`).then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
      );

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
      render: (v: any) => <span className="capitalize font-semibold text-gray-300">{v || 'General'}</span>,
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
      key: 'actions',
      label: 'Reprint',
      render: (_v: any, row: any) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleReprint(row)}
          isLoading={reprintLoadingId === row.id}
          leftIcon={<Printer size={12} />}
        >
          Reprint
        </Button>
      ),
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
                ticketType={createdTickets[currentTicketIndex]?.ticketType}
                price={createdTickets[currentTicketIndex]?.price}
                exhibitionName={activeExhibitionName}
              />
            </div>

            {/* Print Only Layout (Renders ALL tickets in the batch) */}
            <div className="hidden print:block space-y-6">
              {createdTickets.map((ticket, idx) => (
                <div key={ticket.id} className="page-break-after-always">
                  <QRDisplay
                    ticketNumber={ticket.ticketNumber}
                    qrPayload={ticket.qrPayload || ''}
                    qrDataUrl={createdQrDataUrls[idx]}
                    ticketType={ticket.ticketType}
                    price={ticket.price}
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
