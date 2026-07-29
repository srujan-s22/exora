'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Ticket, CreditCard, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';
import type { Exhibition } from '@/types/exhibition.types';

interface GeneratedResult {
  tickets: Array<{ id: string; ticketNumber: string; ticketType: string; price: number; status: string }>;
  qrDataUrls: string[];
  count: number;
}

function formatPrice(paise: number): string {
  if (paise === 0) return 'Free';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function AdminCreateTicketsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  // Form state
  const [exhibitionId, setExhibitionId] = React.useState('');
  const [ticketType, setTicketType] = React.useState('');
  const [quantity, setQuantity] = React.useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = React.useState('free');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [upiTransactionRef, setUpiTransactionRef] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // UI state
  const [exhibitions, setExhibitions] = React.useState<Exhibition[]>([]);
  const [selectedExhibition, setSelectedExhibition] = React.useState<Exhibition | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingExhibitions, setIsLoadingExhibitions] = React.useState(true);
  const [result, setResult] = React.useState<GeneratedResult | null>(null);
  const [error, setError] = React.useState('');

  // Load exhibitions
  React.useEffect(() => {
    async function loadExhibitions() {
      try {
        const res = await fetch('/api/exhibitions?limit=100&includeArchived=false');
        if (!res.ok) throw new Error('Failed to load exhibitions');
        const body = await res.json();
        if (body.success) {
          const list = body.data.data || body.data;
          setExhibitions(list);
        }
      } catch {
        addToast({ type: 'error', title: 'Failed to load exhibitions' });
      } finally {
        setIsLoadingExhibitions(false);
      }
    }
    loadExhibitions();
  }, [addToast]);

  // When exhibition selection changes, update the dependent state
  React.useEffect(() => {
    if (exhibitionId) {
      const exh = exhibitions.find((e) => e.id === exhibitionId) || null;
      setSelectedExhibition(exh);
      setTicketType('');
    } else {
      setSelectedExhibition(null);
      setTicketType('');
    }
  }, [exhibitionId, exhibitions]);

  const ticketTypeOptions = React.useMemo(() => {
    if (!selectedExhibition?.ticketTypes) return [];
    return selectedExhibition.ticketTypes.map((t) => ({
      label: `${t.name} — ${formatPrice(t.price)}`,
      value: t.name,
    }));
  }, [selectedExhibition]);

  const selectedTicketPrice = React.useMemo(() => {
    if (!selectedExhibition || !ticketType) return 0;
    return selectedExhibition.ticketTypes.find((t) => t.name === ticketType)?.price || 0;
  }, [selectedExhibition, ticketType]);

  const qtyNum = typeof quantity === 'number' ? quantity : 0;
  const totalCost = selectedTicketPrice * qtyNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (quantity === '' || qtyNum < 1 || qtyNum > 100) {
      setError('Please enter a ticket quantity between 1 and 100.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        exhibitionId,
        ticketType,
        quantity: qtyNum,
        paymentMethod,
        ...(customerName && { customerName }),
        ...(customerPhone && { customerPhone }),
        ...(upiTransactionRef && { upiTransactionRef }),
        ...(notes && { notes }),
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to generate tickets');
      }

      setResult(body.data);
      addToast({
        type: 'success',
        title: `${body.data.count} ticket${body.data.count > 1 ? 's' : ''} generated!`,
        message: `Created for ${selectedExhibition?.name || 'exhibition'}`,
      });
    } catch (err: any) {
      setError(err.message);
      addToast({
        type: 'error',
        title: 'Ticket generation failed',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = [
    { label: 'Free / Complimentary', value: 'free' },
    { label: 'Cash', value: 'cash' },
    { label: 'UPI', value: 'upi' },
  ];

  // Success view after generation
  if (result) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-accent-400 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Tickets</span>
        </Link>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-success" />
            </div>
            <CardTitle className="text-xl">Tickets Generated Successfully</CardTitle>
            <CardDescription className="mt-1">
              {result.count} ticket{result.count > 1 ? 's' : ''} created for{' '}
              <span className="text-gray-200 font-semibold">{selectedExhibition?.name}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg bg-gray-800/40 border border-gray-700/30 p-4 text-center">
                <span className="text-2xl font-bold text-accent-400">{result.count}</span>
                <p className="text-xs text-gray-400 mt-1">Tickets</p>
              </div>
              <div className="rounded-lg bg-gray-800/40 border border-gray-700/30 p-4 text-center">
                <span className="text-sm font-semibold text-gray-200 capitalize">{ticketType}</span>
                <p className="text-xs text-gray-400 mt-1">Class</p>
              </div>
              <div className="rounded-lg bg-gray-800/40 border border-gray-700/30 p-4 text-center">
                <span className="text-sm font-semibold text-gray-200">{formatPrice(totalCost)}</span>
                <p className="text-xs text-gray-400 mt-1">Total Value</p>
              </div>
              <div className="rounded-lg bg-gray-800/40 border border-gray-700/30 p-4 text-center">
                <span className="text-sm font-semibold text-gray-200 capitalize">{paymentMethod}</span>
                <p className="text-xs text-gray-400 mt-1">Payment</p>
              </div>
            </div>

            {/* QR Preview Grid */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Generated QR Codes</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {result.tickets.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/admin/tickets/${t.id}`}
                    className="group rounded-xl border border-gray-700/50 bg-gray-800/30 p-3 flex flex-col items-center gap-2 hover:bg-gray-800/60 hover:border-accent-500/30 transition-all"
                  >
                    {result.qrDataUrls[i] && (
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-white p-1.5">
                        <img
                          src={result.qrDataUrls[i]}
                          alt={`QR for ${t.ticketNumber}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <span className="text-[10px] font-mono text-gray-400 group-hover:text-accent-400 transition-colors">
                      {t.ticketNumber}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setError('');
              }}
            >
              Generate More
            </Button>
            <Button onClick={() => router.push('/admin/tickets')}>
              View All Tickets
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-accent-400 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back to Tickets</span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-50">Generate Tickets</h1>
        <p className="mt-1 text-sm text-gray-400">
          Create a batch of tickets for an exhibition. Each ticket will receive a unique secure QR code.
        </p>
      </div>

      {isLoadingExhibitions ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-error/10 border border-error/20 p-4">
                  <AlertTriangle size={18} className="text-error shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-error">Generation Failed</p>
                    <p className="text-xs text-error/80 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Exhibition Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Exhibition <span className="text-error">*</span>
                </label>
                <Select
                  value={exhibitionId}
                  onChange={(e) => setExhibitionId(e.target.value)}
                  options={[
                    { label: 'Select an exhibition...', value: '' },
                    ...exhibitions.map((e) => ({
                      label: `${e.name} — ${e.status}`,
                      value: e.id,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Ticket Class Selection */}
              {selectedExhibition && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Ticket Class <span className="text-error">*</span>
                  </label>
                  {ticketTypeOptions.length === 0 ? (
                    <p className="text-xs text-warning">
                      This exhibition has no ticket types configured. Please add ticket types first.
                    </p>
                  ) : (
                    <Select
                      value={ticketType}
                      onChange={(e) => setTicketType(e.target.value)}
                      options={[{ label: 'Select a class...', value: '' }, ...ticketTypeOptions]}
                      className="w-full"
                    />
                  )}
                </div>
              )}

              {/* Quantity & Payment Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Quantity <span className="text-error">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="Enter quantity"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuantity(val === '' ? '' : Math.min(100, Math.max(1, parseInt(val, 10) || 0)));
                    }}
                    className="w-full h-10"
                  />
                  <p className="text-[10px] text-gray-500">Max 100 per batch</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Payment Method <span className="text-error">*</span>
                  </label>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    options={paymentMethods}
                    className="w-full"
                  />
                </div>
              </div>

              {/* UPI Reference (conditional) */}
              {paymentMethod === 'upi' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    UPI Transaction Reference
                  </label>
                  <Input
                    placeholder="e.g. UPI123456789"
                    value={upiTransactionRef}
                    onChange={(e) => setUpiTransactionRef(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              )}

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Customer Name
                  </label>
                  <Input
                    placeholder="Optional"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Customer Phone
                  </label>
                  <Input
                    placeholder="Optional"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Admin Notes
                </label>
                <Textarea
                  placeholder="Internal notes about this batch..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full"
                />
              </div>

              {/* Cost Summary */}
              {ticketType && selectedTicketPrice >= 0 && (
                <div className="rounded-lg bg-gray-800/50 border border-gray-700/40 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                      <CreditCard size={18} className="text-accent-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-200">Order Summary</p>
                      <p className="text-xs text-gray-400">
                        {quantity} × {ticketType} @ {formatPrice(selectedTicketPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent-400">{formatPrice(totalCost)}</p>
                    <Badge variant={paymentMethod === 'free' ? 'info' : 'success'} className="mt-0.5">
                      {paymentMethod.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/admin/tickets')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={!exhibitionId || !ticketType || quantity === '' || qtyNum < 1}
                leftIcon={<Ticket size={16} />}
              >
                Generate {qtyNum > 0 ? `${qtyNum} Ticket${qtyNum > 1 ? 's' : ''}` : 'Tickets'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
