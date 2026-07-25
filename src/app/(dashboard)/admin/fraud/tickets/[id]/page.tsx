'use client';

import * as React from 'react';
import { ArrowLeft, Clock, Ticket, Banknote, ShieldAlert, ShieldCheck, Activity, Key, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';
import Link from 'next/link';

export default function TicketForensicsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = React.use(params);
  const ticketRef = decodeURIComponent(rawId);
  
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [forensics, setForensics] = React.useState<any>(null);

  const fetchTicketForensics = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/fraud/tickets?ticketNumber=${ticketRef}`);
      const body = await res.json();
      if (res.ok && body.success) {
        setForensics(body.data);
      } else {
        addToast({
          type: 'error',
          title: 'Investigation Failed',
          message: body.error?.message || 'Could not load forensic data for ticket.',
        });
      }
    } catch (e) {
      console.error(e);
      addToast({
        type: 'error',
        title: 'Connection Failure',
        message: 'Could not connect to forensics timeline server.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [ticketRef, addToast]);

  React.useEffect(() => {
    fetchTicketForensics();
  }, [fetchTicketForensics]);

  if (isLoading) {
    return (
      <ContentWrapper>
        <div className="flex min-h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-300" />
        </div>
      </ContentWrapper>
    );
  }

  if (!forensics) {
    return (
      <ContentWrapper>
        <div className="py-12 text-center text-gray-500">
          <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-150">Ticket Record Not Found</h2>
          <p className="text-sm text-gray-400 mt-2">The ticket identifier '{ticketRef}' does not correspond to any registered credentials.</p>
          <Link href="/admin/fraud" className="mt-6 inline-flex items-center gap-1.5 text-xs text-accent-300 font-bold hover:underline">
            <ArrowLeft size={12} /> Return to security alerts
          </Link>
        </div>
      </ContentWrapper>
    );
  }

  const { ticket, sale, scans, auditLogs } = forensics;

  return (
    <ContentWrapper>
      {/* Back navigation */}
      <div className="mb-4">
        <Link href="/admin/fraud" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 font-semibold select-none">
          <ArrowLeft size={12} /> Back to Fraud Alerts
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        title={`Ticket History & Verification: ${ticket.ticketNumber}`}
        description="Complete timeline tracking ticket details, purchase information, and gate check history."
        showDivider
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket & Sales Ledger Cards (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Ticket Info Card */}
          <Card className="border border-gray-800 bg-gray-900 shadow-sm">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Ticket size={14} className="text-accent-300" />
                <span>Ticket Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Ticket Class</span>
                <span className="font-bold text-gray-150 capitalize">{ticket.ticketType}</span>
              </div>
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Exhibition</span>
                <span className="font-bold text-gray-150">{ticket.exhibitionName || 'Global Access'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Price Paid</span>
                <span className="font-bold text-accent-300">₹{ticket.price / 100}</span>
              </div>
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Current Status</span>
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase
                  ${ticket.status === 'used' ? 'bg-amber-500/10 text-amber-500' : ''}
                  ${ticket.status === 'valid' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                  ${ticket.status === 'cancelled' ? 'bg-red-500/10 text-red-600' : ''}
                `}>
                  {ticket.status}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Scan Count</span>
                <span className="font-mono font-bold text-gray-200">{ticket.scanCount || 0} times</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-gray-500">Issued On</span>
                <span className="font-mono text-gray-300">{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Sales Transaction Details */}
          {sale ? (
            <Card className="border border-gray-800 bg-gray-900 shadow-sm">
              <CardHeader className="py-4 border-b border-gray-850">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Banknote size={14} className="text-emerald-500" />
                  <span>Sales Transaction Audit</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-gray-850 pb-2">
                  <span className="text-gray-500">Transaction Ref</span>
                  <span className="font-mono font-bold text-gray-150">{sale.transactionId}</span>
                </div>
                <div className="flex justify-between border-b border-gray-850 pb-2">
                  <span className="text-gray-500">Payment Channel</span>
                  <span className="font-bold text-gray-250 uppercase">{sale.paymentMethod}</span>
                </div>
                {sale.upiTransactionRef && (
                  <div className="flex justify-between border-b border-gray-850 pb-2">
                    <span className="text-gray-500">UPI Ref</span>
                    <span className="font-mono text-gray-300">{sale.upiTransactionRef}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-gray-850 pb-2">
                  <span className="text-gray-500">Counter Operator</span>
                  <Link href={`/admin/fraud/staff/${sale.soldBy?.staffId}`} className="font-bold text-accent-300 hover:underline">
                    {sale.soldBy?.name || 'Counter Operator'}
                  </Link>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-gray-500">Customer Name</span>
                  <span className="font-bold text-gray-300">{sale.customerName || 'Walk-in Guest'}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-gray-800 bg-gray-900/50 shadow-sm p-5 text-center text-xs text-gray-500 select-none">
              No sales receipt linked. Ticket generated manually or via bulk.
            </Card>
          )}

        </div>

        {/* Dynamic Forensics Verification Timelines (Right Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gate Scan Verification History */}
          <Card className="border border-gray-800 bg-gray-900 shadow-lg">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Activity size={14} className="text-red-500" />
                <span>Gate Scan Telemetry Logs ({scans.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {scans.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 select-none">This ticket has not been scanned at any gate yet.</div>
              ) : (
                <div className="relative pl-6 border-l border-gray-800 space-y-6">
                  {scans.map((scan: any, index: number) => {
                    const isRejection = scan.result.startsWith('rejected_');
                    return (
                      <div key={scan.id} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border-2 bg-gray-900
                          ${isRejection ? 'border-red-500' : 'border-emerald-500'}
                        `} />
                        
                        <div className="space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`font-extrabold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded
                              ${isRejection ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'}
                            `}>
                              {scan.result.replace('rejected_', '').replace('_', ' ')}
                            </span>
                            <span className="font-mono text-gray-500">
                              {new Date(scan.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-gray-300">
                            Scanned by gate staff <Link href={`/admin/fraud/staff/${scan.scannedByStaffId}`} className="font-bold text-gray-150 hover:underline">{scan.scannedByName}</Link> at gate checkpoint <strong>{scan.gateId || 'Main Entrance'}</strong>
                          </p>
                          {scan.reason && (
                            <p className={`font-mono text-[10px] p-2 rounded border leading-relaxed
                              ${isRejection ? 'bg-red-500/5 text-red-600 border-red-500/10' : 'bg-gray-850 text-gray-400 border-gray-800'}
                            `}>
                              Details: {scan.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Events Logs */}
          <Card className="border border-gray-800 bg-gray-900 shadow-lg">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Key size={14} className="text-gray-400" />
                <span>Audit Logs History Trail ({auditLogs.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {auditLogs.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500 select-none">No system audit records logged directly to this ticket.</div>
              ) : (
                <div className="relative pl-6 border-l border-gray-800 space-y-5">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full bg-accent-500" />
                      <div className="text-xs">
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                          <span>{log.action}</span>
                          <span>{new Date(log.timestamp).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-gray-300 mt-1">{log.details.result ? `Validated entry: ${log.details.ticketNumber}` : JSON.stringify(log.details)}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Performed by: {log.performedByName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </ContentWrapper>
  );
}
