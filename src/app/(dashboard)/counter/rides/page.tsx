'use client';

import * as React from 'react';
import { ShoppingCart, Banknote, Smartphone, Printer, AlertCircle, Gamepad2, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { QRDisplay } from '@/components/shared/qr-display';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import type { Ride } from '@/types/ride.types';

export default function CounterRidesPOSPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const router = useRouter();

  // Page States
  const [dataLoading, setDataLoading] = React.useState(true);
  const [activeExhibitions, setActiveExhibitions] = React.useState<any[]>([]);
  const [selectedExhId, setSelectedExhId] = React.useState('');
  
  // Rides List States
  const [rides, setRides] = React.useState<Ride[]>([]);
  const [isLoadingRides, setIsLoadingRides] = React.useState(false);
  const [selectedRide, setSelectedRide] = React.useState<Ride | null>(null);

  // POS Form States (when a ride is selected)
  const [quantity, setQuantity] = React.useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'upi'>('cash');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [upiTransactionRef, setUpiTransactionRef] = React.useState('');
  const [cashReceived, setCashReceived] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Print Preview States
  const [showPrintModal, setShowPrintModal] = React.useState(false);
  const [createdTickets, setCreatedTickets] = React.useState<any[]>([]);
  const [createdQrDataUrls, setCreatedQrDataUrls] = React.useState<string[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Role gate & permission check
  React.useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'counter' && user.role !== 'admin' && user.role !== 'super_admin') {
        router.push('/unauthorized');
      } else if (!hasPermission('canSellRideTickets')) {
        router.push('/counter');
      }
    }
  }, [user, authLoading, router, hasPermission]);

  // Fetch exhibitions
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

  // Load rides whenever exhibition scope changes
  React.useEffect(() => {
    if (!selectedExhId) return;
    async function loadRides() {
      setIsLoadingRides(true);
      setSelectedRide(null); // clear any active POS forms
      try {
        const res = await fetch(`/api/rides?exhibitionId=${selectedExhId}&status=open`);
        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            setRides(body.data || []);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingRides(false);
      }
    }
    loadRides();
  }, [selectedExhId]);

  // Pricing calculations
  const unitPrice = selectedRide ? selectedRide.price : 0;
  const qtyNum = typeof quantity === 'number' ? quantity : 0;
  const totalCost = unitPrice * qtyNum; // in paise
  const totalCostInRupees = totalCost / 100;
  
  // Cash Change calculations
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeDueInRupees = paymentMethod === 'cash' ? Math.max(0, cashReceivedNum - totalCostInRupees) : 0;

  const handlePOSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRide) return;
    if (quantity === '' || qtyNum < 1 || qtyNum > 50) {
      addToast({ type: 'warning', title: 'Invalid Quantity', message: 'Please enter a ticket quantity between 1 and 50.' });
      return;
    }

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
        rideId: selectedRide.id,
        quantity: qtyNum,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        upiTransactionRef: paymentMethod === 'upi' ? upiTransactionRef.trim() : undefined,
        cashReceived: paymentMethod === 'cash' ? Math.round(cashReceivedNum * 100) : undefined,
        changeGiven: paymentMethod === 'cash' ? Math.round(changeDueInRupees * 100) : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/rides/tickets', {
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
          title: 'Ticket(s) Issued',
          message: `Sold ${qtyNum} ticket(s) for '${selectedRide.name}' - Total: ₹${totalCostInRupees}`,
        });

        // Reset POS Form
        setSelectedRide(null);
        setCustomerName('');
        setCustomerPhone('');
        setUpiTransactionRef('');
        setCashReceived('');
        setNotes('');
        setQuantity('');
      } else {
        addToast({
          type: 'error',
          title: 'Transaction Failed',
          message: body.error?.message || 'Error occurred while selling ride ticket.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to communicate with ticket generator.',
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
        <PageHeader title="Pay-Per-Ride Ticketing POS" description="Sell individual ride admission tickets." showDivider />
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

  const activeExhibitionName = activeExhibitions.find(e => e.id === selectedExhId)?.name || 'Exhibition';

  return (
    <ContentWrapper>
      <PageHeader
        title="Pay-Per-Ride POS Desk"
        description="Select a ride/game and generate admission codes for visitors."
        showDivider
      />

      {/* Select Exhibition Scope */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 mb-8">
        <span className="text-sm font-semibold text-gray-300 shrink-0">Exhibition context:</span>
        <Select
          value={selectedExhId}
          onChange={(e) => setSelectedExhId(e.target.value)}
          options={activeExhibitions.map((e) => ({ label: e.name, value: e.id }))}
          className="w-full md:w-96"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column: Grid of Rides */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
            <Gamepad2 className="text-accent-400" />
            <span>Available Rides & Games</span>
          </h2>

          {isLoadingRides ? (
            <div className="flex h-36 items-center justify-center">
              <Spinner size="md" className="text-accent-500" />
            </div>
          ) : rides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-800 rounded-xl bg-gray-900/20 text-center">
              <AlertCircle size={32} className="text-gray-500 mb-2" />
              <h3 className="text-sm font-semibold text-gray-450">No Open Rides/Games Configured</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                There are no open or active rides found for this exhibition scope in the system.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rides.map((ride) => (
                <Card
                  key={ride.id}
                  onClick={() => setSelectedRide(ride)}
                  className={`border transition-all cursor-pointer select-none group relative overflow-hidden
                    ${
                      selectedRide?.id === ride.id
                        ? 'border-accent-500 bg-accent-500/5 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                    }
                  `}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-150 group-hover:text-white transition-colors">{ride.name}</h3>
                        <Badge variant="accent" className="font-mono text-xs font-extrabold bg-accent-500/10 text-accent-300 border-accent-500/20">
                          ₹{(ride.price / 100).toFixed(2)}
                        </Badge>
                      </div>
                      {ride.description && (
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{ride.description}</p>
                      )}
                    </div>
                    <div className="flex justify-end pt-3">
                      <span className="text-[10px] font-bold text-accent-400 uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1.5 transition-transform duration-200">
                        <span>Initiate Sale</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Checkout POS Drawer Form */}
        <div className="space-y-6">
          {selectedRide ? (
            <Card className="border border-accent-500/30 bg-gray-900/60 backdrop-blur-xs shadow-2xl relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-accent-500" />
              <CardHeader className="py-4 border-b border-gray-850">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <ShoppingCart className="text-accent-400" size={16} />
                  <span>Ticket Checkout</span>
                </CardTitle>
                <CardDescription className="text-accent-400 font-semibold text-xs mt-1">
                  Selling tickets for: {selectedRide.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <form onSubmit={handlePOSSubmit} className="space-y-5">
                  
                  {/* Quantity input */}
                  <Input
                    label="Quantity"
                    type="number"
                    min={1}
                    max={50}
                    placeholder="Enter quantity"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuantity(val === '' ? '' : parseInt(val, 10));
                    }}
                    disabled={isSubmitting}
                  />

                  {/* Customer details */}
                  <div className="space-y-3">
                    <Input
                      label="Customer Name (Optional)"
                      placeholder="Buyer's name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Input
                      label="Customer Phone (Optional)"
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <Input
                    label="Transaction Notes"
                    placeholder="Ref shift logs or comments"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                  />

                  {/* Payment selector */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-gray-450 uppercase tracking-widest">
                      Payment Mode
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all
                          ${paymentMethod === 'cash'
                            ? 'bg-success/15 border-success text-success font-bold'
                            : 'bg-gray-850 border-gray-800 text-gray-400 hover:bg-gray-800'
                          }
                        `}
                        disabled={isSubmitting}
                      >
                        <Banknote size={14} />
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all
                          ${paymentMethod === 'upi'
                            ? 'bg-info/15 border-info text-info font-bold'
                            : 'bg-gray-850 border-gray-800 text-gray-400 hover:bg-gray-800'
                          }
                        `}
                        disabled={isSubmitting}
                      >
                        <Smartphone size={14} />
                        <span>UPI</span>
                      </button>
                    </div>
                  </div>

                  {/* Cash Change details */}
                  {paymentMethod === 'cash' ? (
                    <div className="space-y-3 p-3.5 rounded-lg bg-gray-850 border border-gray-800">
                      <Input
                        label={`Cash Received (Payable: ₹${totalCostInRupees})`}
                        placeholder="0.00"
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span>Refunding Change:</span>
                        <span className="text-success text-base">₹{changeDueInRupees}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-gray-850 border border-gray-800">
                      <Input
                        label="UPI Transaction ID"
                        placeholder="12-digit UPI reference ID"
                        value={upiTransactionRef}
                        onChange={(e) => setUpiTransactionRef(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  {/* Net Payable Summary */}
                  <div className="border-t border-gray-800/80 pt-4.5 flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-450 uppercase tracking-widest">Net Payable:</span>
                    <span className="text-xl font-black text-white font-mono">₹{totalCostInRupees.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedRide(null)}
                      disabled={isSubmitting}
                      className="col-span-1 font-semibold text-xs"
                    >
                      Clear
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                      className="col-span-2 py-2.5 font-bold text-xs"
                    >
                      Generate Tickets
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed border-gray-800 bg-gray-900/30 text-center p-8 flex flex-col items-center justify-center min-h-[300px]">
              <Gamepad2 className="text-gray-700 animate-pulse mb-3" size={32} />
              <h3 className="text-sm font-bold text-gray-400">POS Cart Idle</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                Click on any of the open ride/game cards to activate the ticketing POS form.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Ride Ticket printable modal */}
      {createdTickets.length > 0 && (
        <Modal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Printable Ride Ticket Voucher"
          description="Send to printer or scan directly from this display."
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
          <div className="py-2">
            {/* Carousel navigation for batch tickets */}
            {createdTickets.length > 1 && (
              <div className="flex items-center justify-between mb-4 bg-gray-850 p-2 rounded-lg print:hidden">
                <span className="text-xs font-semibold text-gray-300">
                  Voucher {currentTicketIndex + 1} of {createdTickets.length}
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

            {/* Screen layout */}
            <div className="print:hidden">
              <QRDisplay
                ticketNumber={createdTickets[currentTicketIndex]?.ticketNumber}
                qrPayload={createdTickets[currentTicketIndex]?.qrPayload || ''}
                qrDataUrl={createdQrDataUrls[currentTicketIndex]}
                ticketType="RIDE PASS"
                price={(createdTickets[currentTicketIndex]?.price || 0) * (createdTickets[currentTicketIndex]?.quantity || 1)}
                quantity={createdTickets[currentTicketIndex]?.quantity || 1}
                usedCount={createdTickets[currentTicketIndex]?.usedCount || 0}
                remainingCount={createdTickets[currentTicketIndex]?.remainingCount ?? (createdTickets[currentTicketIndex]?.quantity || 1)}
                exhibitionName={`${activeExhibitionName} (Ride Admission)`}
              />
            </div>

            {/* Printer layout */}
            <div className="hidden print:block printable-area">
              {createdTickets.map((ticket, idx) => (
                <div key={ticket.id} className={`printable-ticket-card ${idx < createdTickets.length - 1 ? 'page-break-after-always' : ''}`}>
                  <QRDisplay
                    ticketNumber={ticket.ticketNumber}
                    qrPayload={ticket.qrPayload || ''}
                    qrDataUrl={createdQrDataUrls[idx]}
                    ticketType="RIDE PASS"
                    price={(ticket.price || 0) * (ticket.quantity || 1)}
                    quantity={ticket.quantity || 1}
                    usedCount={ticket.usedCount || 0}
                    remainingCount={ticket.remainingCount ?? (ticket.quantity || 1)}
                    exhibitionName={`${activeExhibitionName} (Ride Admission)`}
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
