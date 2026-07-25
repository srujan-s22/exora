'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Gamepad2, Play, Square, History, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { QRScanner } from '@/components/shared/qr-scanner';
import { ScanResultCard } from '@/components/shared/scan-result-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';

export default function RideStaffDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [dataLoading, setDataLoading] = React.useState(true);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  // Scanner outcome state
  const [activeScan, setActiveScan] = React.useState<any | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Auth gate check
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'ride' && user.role !== 'admin' && user.role !== 'super_admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  const loadDashboardData = React.useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await fetch('/api/dashboard/ride-stats?staffDashboard=true');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setDashboardData(body.data);
        }
      } else {
        throw new Error('Failed to load dashboard.');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error loading dashboard',
        message: err.message || 'Check your connection.',
      });
    } finally {
      setDataLoading(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    if (user && (user.role === 'ride' || user.role === 'admin' || user.role === 'super_admin')) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Toggle status (open/closed)
  const handleToggleStatus = async () => {
    if (!dashboardData?.ride) return;
    const rideId = dashboardData.ride.id;
    const nextStatus = dashboardData.ride.status === 'open' ? 'closed' : 'open';

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/rides/${rideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        addToast({
          type: 'success',
          title: 'Status Updated',
          message: `Your ride status is now marked ${nextStatus}.`,
        });
        loadDashboardData();
      } else {
        throw new Error(body.error?.message || 'Failed to toggle status');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update failed',
        message: err.message,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleScanTrigger = async (payload: string, isFake = false) => {
    if (!dashboardData?.assigned || !dashboardData?.ride) {
      addToast({
        type: 'warning',
        title: 'Ride Assignment Required',
        message: 'You have no active ride assigned.',
      });
      return;
    }

    const { ride } = dashboardData;
    setIsProcessing(true);

    try {
      const payloadToSend = isFake ? 'tampered-fake-signature-token-payload' : payload;

      const res = await fetch('/api/rides/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload: payloadToSend,
          exhibitionId: ride.exhibitionId,
          rideId: ride.id,
          gateId: 'ride-dashboard-terminal',
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        const outcome = body.data; // contains valid, result, ticket, message
        
        const scanRecord = {
          id: `scan-${Date.now()}`,
          result: outcome.result,
          ticketNumber: outcome.ticket?.ticketNumber || 'UNKNOWN',
          ticketType: outcome.ticket?.ticketType || 'ride',
          customerName: outcome.ticket?.customerName,
          errorDetails: outcome.valid ? undefined : outcome.message,
          scannedAt: new Date(),
        };

        setActiveScan(scanRecord);

        // Feedback alert
        if (outcome.valid) {
          addToast({
            type: 'success',
            title: 'Rider Admitted',
            message: `${scanRecord.ticketNumber} verified successfully.`,
          });
        } else {
          addToast({
            type: 'error',
            title: 'Scan Rejected',
            message: outcome.message,
          });
        }

        // Refresh stats
        loadDashboardData();
      } else {
        addToast({
          type: 'error',
          title: 'Verification Failed',
          message: body.error?.message || 'Verification endpoint encountered a crash.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Network Timeout',
        message: 'Validation API request timed out.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    {
      key: 'ticketId',
      label: 'Ticket Ref',
      render: (t: any, row: any) => {
        const number = row.ticketNumber || (typeof t === 'object' ? t?.ticketNumber : t) || 'UNKNOWN';
        return <span className="font-mono font-bold">{number}</span>;
      },
    },
    {
      key: 'result',
      label: 'Outcome Status',
      render: (v: any) => {
        const statusMap: Record<string, string> = {
          admitted: 'active',
          rejected_used: 'paused',
          rejected_wrong_ride: 'false',
          rejected_invalid: 'false',
          rejected_closed: 'false',
          rejected_unknown: 'false',
        };
        const labelMap: Record<string, string> = {
          admitted: 'Admitted',
          rejected_used: 'Duplicate',
          rejected_wrong_ride: 'Wrong Ride',
          rejected_invalid: 'Invalid Pass',
          rejected_closed: 'Ride Closed',
          rejected_unknown: 'Suspicious/Forged',
        };
        return (
          <span className="flex items-center gap-1">
            <StatusIndicator status={statusMap[v] || 'false'} />
            <span className="text-xs text-gray-400 font-medium ml-1">({labelMap[v] || v})</span>
          </span>
        );
      },
    },
    {
      key: 'scannedAt',
      label: 'Scanned At',
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

  // If staff has no ride assigned
  if (!dashboardData || !dashboardData.assigned) {
    return (
      <ContentWrapper>
        <PageHeader title="Ride Ticket Scanner" description="Scan and verify ride tickets." showDivider />
        <div className="mx-auto max-w-lg mt-12 p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-center text-warning mb-4">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-50 mb-2">No Ride Assigned</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your account is currently not assigned to scan tickets for any rides or games inside the exhibition. Please contact your system administrator.
          </p>
          <Button
            variant="secondary"
            onClick={loadDashboardData}
            leftIcon={<RefreshCw size={14} />}
            className="font-semibold text-xs mx-auto"
          >
            Check Again
          </Button>
        </div>
      </ContentWrapper>
    );
  }

  const { ride, todayTicketsCount, validCount, invalidCount, totalScansToday, recentScans } = dashboardData;

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title={`Ride Ticket Scanner: ${ride.name}`}
        description="Scan and verify ride tickets in real time. Prevents reuse of old or invalid tickets."
        showDivider
      />

      {/* Statistics Shift summary cards */}
      <div className="grid gap-5 sm:grid-cols-3 mb-8">
        <StatCard
          title="Riders Admitted Today"
          value={validCount || 0}
          icon="CheckCircle2"
        />
        <StatCard
          title="Total Scans Processed"
          value={totalScansToday || 0}
          icon="ScanLine"
        />
        <StatCard
          title="Failed / Blocked Attempts"
          value={invalidCount || 0}
          icon="ShieldAlert"
        />
      </div>

      {/* Scope Details Bar */}
      <div className="mb-6 bg-gray-900 border border-gray-800 p-4 rounded-xl max-w-md select-none">
        <span className="block text-[10px] font-bold text-accent-400 uppercase tracking-widest mb-2">Assigned Checkpoint Ride Context</span>
        <div className="flex justify-between items-center bg-gray-950 px-3.5 py-2.5 rounded-lg border border-gray-850">
          <span className="text-sm font-bold text-gray-100">{ride.name}</span>
          <span className="text-xs text-accent-300 font-bold">₹{ride.price / 100} / rider</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Scanner view (Left) */}
        <div className="lg:col-span-1">
          {!activeScan ? (
            <QRScanner onScan={handleScanTrigger} isProcessing={isProcessing} />
          ) : (
            <ScanResultCard
              result={activeScan.result}
              ticketNumber={activeScan.ticketNumber}
              ticketType={activeScan.ticketType}
              customerName={activeScan.customerName}
              errorDetails={activeScan.errorDetails}
              scannedAt={activeScan.scannedAt}
              onReset={() => setActiveScan(null)}
            />
          )}
        </div>

        {/* Scan log feed (Right) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 select-none flex items-center gap-2">
            <History size={15} className="text-gray-500" />
            <span>Ride Entrance Logs (Today)</span>
          </h3>
          <DataTable columns={columns} data={recentScans} />
        </div>
      </div>
    </ContentWrapper>
  );
}
