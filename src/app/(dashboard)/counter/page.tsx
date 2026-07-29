'use client';

import * as React from 'react';
import { ShoppingCart, Banknote, Smartphone, Printer, History, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { QRDisplay } from '@/components/shared/qr-display';
import { useToast } from '@/components/providers/toast-provider';
import { DataTable } from '@/components/ui/data-table';
import { PaymentBadge } from '@/components/shared/payment-badge';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function CounterDashboardPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const router = useRouter();

  // Page States
  const [dataLoading, setDataLoading] = React.useState(true);
  const [activeExhibitions, setActiveExhibitions] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [recentSales, setRecentSales] = React.useState<any[]>([]);

  // Form State
  const [selectedExhId, setSelectedExhId] = React.useState('');
  const [ticketType, setTicketType] = React.useState('');
  const [quantity, setQuantity] = React.useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'upi'>('cash');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [upiTransactionRef, setUpiTransactionRef] = React.useState('');
  const [cashReceived, setCashReceived] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Modal print preview states
  const [showPrintModal, setShowPrintModal] = React.useState(false);
  const [createdTickets, setCreatedTickets] = React.useState<any[]>([]);
  const [createdQrDataUrls, setCreatedQrDataUrls] = React.useState<string[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Authentication & Authorization check
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'counter' && user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Load Dashboard Data
  const loadDashboardData = React.useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await fetch('/api/dashboard/counter');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          const exhs = body.data.activeExhibitions || [];
          setActiveExhibitions(exhs);
          setStats(body.data.stats);
          setRecentSales(body.data.recentSales || []);

          // Auto select first exhibition if available
          if (exhs.length > 0) {
            setSelectedExhId(exhs[0].id);
          }
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error Loading Dashboard',
          message: 'Could not fetch active terminal data from server.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Could not connect to the server.',
      });
    } finally {
      setDataLoading(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    if (user && (user.role === 'counter' || user.role === 'admin')) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Auto select correct type on exhibition change
  React.useEffect(() => {
    const exh = activeExhibitions.find((e) => e.id === selectedExhId);
    if (exh && exh.ticketTypes?.length > 0) {
      setTicketType(exh.ticketTypes[0].name);
    } else {
      setTicketType('');
    }
  }, [selectedExhId, activeExhibitions]);

  // Calculate pricing
  const activeExhibition = activeExhibitions.find((e) => e.id === selectedExhId);
  const activeType = activeExhibition?.ticketTypes?.find((t: any) => t.name === ticketType);
  const qtyNum = typeof quantity === 'number' ? quantity : 0;
  const totalCost = activeType ? activeType.price * qtyNum : 0; // in paise

  // Change Calculation
  const totalCostInRupees = totalCost / 100;
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeDueInRupees = paymentMethod === 'cash' ? Math.max(0, cashReceivedNum - totalCostInRupees) : 0;

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExhId) {
      addToast({ type: 'warning', title: 'Selection Required', message: 'Please select an exhibition.' });
      return;
    }
    if (!ticketType) {
      addToast({ type: 'warning', title: 'Selection Required', message: 'Please select a ticket class.' });
      return;
    }
    if (quantity === '' || qtyNum < 1 || qtyNum > 50) {
      addToast({ type: 'warning', title: 'Invalid Quantity', message: 'Please enter a ticket quantity between 1 and 50.' });
      return;
    }

    // Cash validations
    if (paymentMethod === 'cash') {
      if (!cashReceived || cashReceivedNum < totalCostInRupees) {
        addToast({
          type: 'error',
          title: 'Insufficient Cash',
          message: `Collected amount must be at least ₹${totalCostInRupees}`,
        });
        return;
      }
    }

    // UPI validations
    if (paymentMethod === 'upi') {
      if (!upiTransactionRef.trim()) {
        addToast({
          type: 'error',
          title: 'Reference Required',
          message: 'Please enter the UPI Transaction Reference ID for audit matching.',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        exhibitionId: selectedExhId,
        ticketType,
        quantity: qtyNum,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        upiTransactionRef: paymentMethod === 'upi' ? upiTransactionRef.trim() : undefined,
        cashReceived: paymentMethod === 'cash' ? Math.round(cashReceivedNum * 100) : undefined,
        changeGiven: paymentMethod === 'cash' ? Math.round(changeDueInRupees * 100) : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        // Populate tickets and QR codes for preview modal
        setCreatedTickets(body.data.tickets);
        setCreatedQrDataUrls(body.data.qrDataUrls);
        setCurrentTicketIndex(0);
        setShowPrintModal(true);

        addToast({
          type: 'success',
          title: 'Sale Processed Successfully',
          message: `Issued ${qtyNum} ticket(s) - Total: ₹${totalCostInRupees}`,
        });

        // Reset inputs
        setCustomerName('');
        setCustomerPhone('');
        setUpiTransactionRef('');
        setCashReceived('');
        setNotes('');
        setQuantity('');

        // Refresh stats and logs
        loadDashboardData();
      } else {
        addToast({
          type: 'error',
          title: 'Sale Failed',
          message: body.error?.message || 'Error occurred while processing sale.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to submit sale to server.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reprintTicket = (sale: any) => {
    // Generate a temporary reprint list based on sale tickets
    if (!sale.tickets || sale.tickets.length === 0) return;

    // Direct mapping to printable list
    const tempTickets = sale.tickets.map((tId: string, idx: number) => ({
      id: tId,
      ticketNumber: `${sale.transactionId}-${idx + 1}`, // fallback printable mapping
      ticketType: sale.ticketType || 'general',
      price: sale.unitPrice || (sale.totalAmount / sale.ticketCount),
      qrPayload: `reprint:${tId}`,
    }));

    // We can't generate the real QR data URL client-side safely without key,
    // so we will show a reprint notification or load the specific ticket detail.
    // However, to keep it simple, we redirect to history page where reprints are handled.
    router.push('/counter/history');
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
      label: 'Total Amount',
      render: (v: any) => <span className="font-extrabold text-accent-300">₹{v / 100}</span>,
    },
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (v: any) => <PaymentBadge method={v} />,
    },
    {
      key: 'soldAt',
      label: 'Sold At',
      render: (v: any) => (
        <span className="font-mono text-gray-400">
          {new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(v))}
        </span>
      ),
    },
  ];

  if (authLoading || dataLoading) {
    return (
      <ContentWrapper>
        <div className="flex h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      </ContentWrapper>
    );
  }

  // If counter staff has no active exhibitions assigned
  if (activeExhibitions.length === 0) {
    return (
      <ContentWrapper>
        <PageHeader title="Ticket Counter" description="Fast ticket issuing desk." showDivider />
        <div className="mx-auto max-w-lg mt-12 p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-center text-warning mb-4">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-50 mb-2">No Active Exhibitions Assigned</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your staff account is currently not assigned to any active exhibitions. Please contact your system administrator to assign you to a shift.
          </p>
          <Button variant="secondary" onClick={loadDashboardData}>
            Refresh Desk
          </Button>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title="Ticket Counter"
        description="Process walk-in Cash and UPI ticket sales quickly."
        showDivider
      />

      {/* Shift Analytics cards */}
      <div className="grid gap-5 sm:grid-cols-3 mb-8">
        <StatCard
          title="Tickets Issued (Today)"
          value={stats?.totalTickets || 0}
          icon="Ticket"
        />
        <StatCard
          title="Total Sales Collected"
          value={`₹${(stats?.totalRevenue || 0) / 100}`}
          icon="Banknote"
        />
        <StatCard
          title="UPI Payments Share"
          value={`${stats?.totalTickets > 0 ? Math.round((stats.upiTickets / stats.totalTickets) * 100) : 0}%`}
          icon="Smartphone"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket POS Sales Form (Left) */}
        <div className="lg:col-span-1">
          <Card className="border border-gray-850 bg-gray-900 shadow-lg">
            <CardHeader className="py-4.5">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <ShoppingCart size={15} className="text-accent-400" />
                <span>Ticketing Terminal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasPermission('canSellEntryTickets') ? (
                <div className="py-6 text-center space-y-4">
                  <div className="flex justify-center text-warning">
                    <AlertCircle size={36} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Entry Sales Restricted</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Your staff account does not have permission to issue main entry tickets.
                    </p>
                  </div>
                  {hasPermission('canSellRideTickets') && (
                    <Button
                      variant="secondary"
                      className="w-full text-xs"
                      onClick={() => router.push('/counter/rides')}
                    >
                      Go to Ride Ticket Sales
                    </Button>
                  )}
                </div>
              ) : (
              <form onSubmit={handleSaleSubmit} className="space-y-5">
                
                {/* Select Exhibition */}
                <Select
                  label="Select Exhibition"
                  value={selectedExhId}
                  onChange={(e) => setSelectedExhId(e.target.value)}
                  options={activeExhibitions.map((e) => ({ label: e.name, value: e.id }))}
                  disabled={isSubmitting}
                />

                {/* Ticket Class + Quantity */}
                <div className="grid grid-cols-3 gap-3.5">
                  <div className="col-span-2">
                    <Select
                      label="Ticket Class"
                      value={ticketType}
                      onChange={(e) => setTicketType(e.target.value)}
                      options={activeExhibition?.ticketTypes?.map((t: any) => ({
                        label: `${t.name} - ₹${t.price / 100}`,
                        value: t.name,
                      })) || []}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="Qty"
                      type="number"
                      min={1}
                      max={50}
                      placeholder="Qty"
                      value={quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuantity(val === '' ? '' : parseInt(val, 10));
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-3.5">
                  <Input
                    label="Customer Name (Optional)"
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Input
                    label="Phone Number (Optional)"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Notes */}
                <Input
                  label="Sale Notes (Optional)"
                  placeholder="e.g. Group entry"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                />

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <span className="block text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Payment Method
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-semibold select-none cursor-pointer transition-all
                        ${paymentMethod === 'cash'
                          ? 'bg-success/15 border-success text-success'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                        }
                      `}
                      disabled={isSubmitting}
                    >
                      <Banknote size={16} />
                      <span>Cash Pay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-semibold select-none cursor-pointer transition-all
                        ${paymentMethod === 'upi'
                          ? 'bg-info/15 border-info text-info'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                        }
                      `}
                      disabled={isSubmitting}
                    >
                      <Smartphone size={16} />
                      <span>UPI Scan</span>
                    </button>
                  </div>
                </div>

                {/* Conditionally render Payment Flow Fields */}
                {paymentMethod === 'cash' ? (
                  <div className="space-y-3.5 p-3 rounded-lg bg-gray-850 border border-gray-800">
                    <Input
                      label={`Received Amount (Payable: ₹${totalCostInRupees})`}
                      placeholder="e.g. 500"
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
                      <span>Change Due:</span>
                      <span className="text-success text-sm font-bold">₹{changeDueInRupees}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-850 border border-gray-800">
                    <Input
                      label="UPI Transaction Reference ID"
                      placeholder="e.g. 302598716254"
                      value={upiTransactionRef}
                      onChange={(e) => setUpiTransactionRef(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Total Payable Summary */}
                <div className="border-t border-gray-800/80 pt-4 flex justify-between items-center text-sm">
                  <span className="font-semibold text-gray-400">Total Payable:</span>
                  <span className="text-xl font-black text-gray-50">₹{totalCostInRupees}</span>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="w-full font-semibold"
                >
                  Generate Ticket Receipt
                </Button>

              </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transactions list (Right) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 select-none flex items-center gap-2">
            <History size={15} className="text-gray-500" />
            <span>My Shift Issued Logs (Today)</span>
          </h3>
          <DataTable columns={columns} data={recentSales} />
        </div>
      </div>

      {/* Ticket Print Dialog Modal */}
      {createdTickets.length > 0 && (
        <Modal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Print Reciept Preview"
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
                price={(createdTickets[currentTicketIndex]?.price || 0) * (createdTickets[currentTicketIndex]?.quantity || 1)}
                quantity={createdTickets[currentTicketIndex]?.quantity || 1}
                usedCount={createdTickets[currentTicketIndex]?.usedCount || 0}
                remainingCount={createdTickets[currentTicketIndex]?.remainingCount ?? (createdTickets[currentTicketIndex]?.quantity || 1)}
                exhibitionName={activeExhibition?.name || 'Exhibition'}
              />
            </div>

            {/* Print Only Layout (Renders ALL tickets in the batch, break sheet layout) */}
            <div className="hidden print:block space-y-6">
              {createdTickets.map((ticket, idx) => (
                <div key={ticket.id} className="page-break-after-always">
                  <QRDisplay
                    ticketNumber={ticket.ticketNumber}
                    qrPayload={ticket.qrPayload || ''}
                    qrDataUrl={createdQrDataUrls[idx]}
                    ticketType={ticket.ticketType}
                    price={(ticket.price || 0) * (ticket.quantity || 1)}
                    quantity={ticket.quantity || 1}
                    usedCount={ticket.usedCount || 0}
                    remainingCount={ticket.remainingCount ?? (ticket.quantity || 1)}
                    exhibitionName={activeExhibition?.name || 'Exhibition'}
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
