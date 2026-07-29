'use client';

import * as React from 'react';
import { ShoppingCart, Banknote, Smartphone, Printer, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { QRDisplay } from '@/components/shared/qr-display';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function SellTicketsPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const router = useRouter();

  // Page States
  const [dataLoading, setDataLoading] = React.useState(true);
  const [activeExhibitions, setActiveExhibitions] = React.useState<any[]>([]);

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

  // Auth role gating & permission check
  React.useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'counter' && user.role !== 'admin' && user.role !== 'super_admin') {
        router.push('/unauthorized');
      } else if (!hasPermission('canSellEntryTickets')) {
        router.push('/counter');
      }
    }
  }, [user, authLoading, router, hasPermission]);

  // Load exhibitions
  const loadExhibitions = React.useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await fetch('/api/dashboard/counter');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          const exhs = body.data.activeExhibitions || [];
          setActiveExhibitions(exhs);
          if (exhs.length > 0) {
            setSelectedExhId(exhs[0].id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user && (user.role === 'counter' || user.role === 'admin')) {
      loadExhibitions();
    }
  }, [user, loadExhibitions]);

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
          message: 'Please enter the UPI Transaction Reference ID.',
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

  if (authLoading || dataLoading) {
    return (
      <ContentWrapper>
        <div className="flex h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      </ContentWrapper>
    );
  }

  if (activeExhibitions.length === 0) {
    return (
      <ContentWrapper>
        <PageHeader title="Ticket Counter Desk" description="Fast ticket issuing counter." showDivider />
        <div className="mx-auto max-w-lg mt-12 p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-center text-warning mb-4">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-50 mb-2">No Active Exhibitions Assigned</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your staff account is currently not assigned to any active exhibitions. Please contact your system administrator.
          </p>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <PageHeader
        title="Ticket Counter Desk"
        description="Quick checkout for ticket sales."
        showDivider
      />

      <div className="mx-auto max-w-xl">
        <Card className="border border-gray-850 bg-gray-900 shadow-2xl">
          <CardHeader className="py-5 border-b border-gray-800/60">
            <CardTitle className="text-base font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <ShoppingCart className="text-accent-400" size={18} />
              <span>Generate Admission Pass</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaleSubmit} className="space-y-6">
              {/* Select Exhibition */}
              <Select
                label="Active Exhibition"
                value={selectedExhId}
                onChange={(e) => setSelectedExhId(e.target.value)}
                options={activeExhibitions.map((e) => ({ label: e.name, value: e.id }))}
                disabled={isSubmitting}
              />

              {/* Grid ticket class + quantity */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Select
                    label="Select Ticket Class"
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
                    label="Quantity"
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
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Customer Name (Optional)"
                  placeholder="Buyer's name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label="Customer Phone (Optional)"
                  placeholder="Buyer's contact"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <Input
                label="Notes / Comments"
                placeholder="Shift checkout details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
              />

              {/* Payment selector */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Payment Collection Mode
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2.5 py-3 rounded-lg border text-sm font-bold select-none cursor-pointer transition-all
                      ${paymentMethod === 'cash'
                        ? 'bg-success/15 border-success text-success shadow-sm'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                      }
                    `}
                    disabled={isSubmitting}
                  >
                    <Banknote size={16} />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`flex items-center justify-center gap-2.5 py-3 rounded-lg border text-sm font-bold select-none cursor-pointer transition-all
                      ${paymentMethod === 'upi'
                        ? 'bg-info/15 border-info text-info shadow-sm'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                      }
                    `}
                    disabled={isSubmitting}
                  >
                    <Smartphone size={16} />
                    <span>UPI</span>
                  </button>
                </div>
              </div>

              {/* Payment Detail Section */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-3 p-4 rounded-xl bg-gray-850 border border-gray-800">
                  <Input
                    label={`Cash Amount Collected (Payable: ₹${totalCostInRupees})`}
                    placeholder="Enter cash received"
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                    <span>Balance Change to Refund:</span>
                    <span className="text-success text-base">₹{changeDueInRupees}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-850 border border-gray-800">
                  <Input
                    label="Transaction Reference / UPI Ref ID"
                    placeholder="Enter 12-digit transaction ID"
                    value={upiTransactionRef}
                    onChange={(e) => setUpiTransactionRef(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Payable Summary */}
              <div className="border-t border-gray-800/80 pt-4 flex justify-between items-center text-sm">
                <span className="font-bold text-gray-400">Net Payable Amount:</span>
                <span className="text-2xl font-black text-white">₹{totalCostInRupees}</span>
              </div>

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full py-3.5 font-bold"
              >
                Confirm Sale & Print
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Print Dialog Modal */}
      {createdTickets.length > 0 && (
        <Modal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="POS Printable Voucher"
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

            {/* Print Only Layout (Renders ALL tickets in the batch) */}
            <div className="hidden print:block printable-area">
              {createdTickets.map((ticket, idx) => (
                <div key={ticket.id} className={`printable-ticket-card ${idx < createdTickets.length - 1 ? 'page-break-after-always' : ''}`}>
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
