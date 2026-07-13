'use client';

import * as React from 'react';
import { Camera, CheckCircle2, History, AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { StatCard } from '@/components/shared/stat-card';
import { QRScanner } from '@/components/shared/qr-scanner';
import { ScanResultCard } from '@/components/shared/scan-result-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function GateDashboardPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Page States
  const [dataLoading, setDataLoading] = React.useState(true);
  const [activeExhibitions, setActiveExhibitions] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [scans, setScans] = React.useState<any[]>([]);

  // Selected Exhibition
  const [selectedExhId, setSelectedExhId] = React.useState('');

  // Scanner outcome state
  const [activeScan, setActiveScan] = React.useState<any | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Gating check-in operators
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'gate' && user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Load Dashboard Data
  const loadDashboardData = React.useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await fetch('/api/dashboard/gate');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          const exhs = body.data.activeExhibitions || [];
          setActiveExhibitions(exhs);
          setStats(body.data.stats);
          setScans(body.data.recentScans || []);

          // Auto select first assigned exhibition
          if (exhs.length > 0 && !selectedExhId) {
            setSelectedExhId(exhs[0].id);
          }
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error Loading Gate Desk',
          message: 'Failed to retrieve active checkpoint data.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Could not establish connection to gate database.',
      });
    } finally {
      setDataLoading(false);
    }
  }, [selectedExhId, addToast]);

  React.useEffect(() => {
    if (user && (user.role === 'gate' || user.role === 'admin')) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const handleScanTrigger = async (payload: string, isFake = false) => {
    if (!selectedExhId) {
      addToast({
        type: 'warning',
        title: 'Exhibition Required',
        message: 'Please select the exhibition gate scope first.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Mock forgery directly if clicked forge scan button in scanner simulator
      const payloadToSend = isFake ? 'tampered-signature-payload-token' : payload;

      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload: payloadToSend,
          exhibitionId: selectedExhId,
          gateId: 'gate-checkpoint-1',
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        const outcome = body.data; // contains valid, result, ticket, message
        
        const scanRecord = {
          id: `scan-${Date.now()}`,
          result: outcome.result,
          ticketNumber: outcome.ticket?.ticketNumber || 'UNKNOWN',
          ticketType: outcome.ticket?.ticketType,
          customerName: outcome.ticket?.customerName,
          errorDetails: outcome.valid ? undefined : outcome.message,
          scannedAt: new Date(),
        };

        setActiveScan(scanRecord);

        // Feedback alert
        if (outcome.valid) {
          addToast({
            type: 'success',
            title: 'Access Admitted',
            message: `${scanRecord.ticketNumber} verified successfully.`,
          });
        } else {
          addToast({
            type: 'error',
            title: 'Entry Rejected',
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
      render: (t: any) => <span className="font-mono font-bold">{t?.ticketNumber || 'UNKNOWN'}</span>,
    },
    {
      key: 'result',
      label: 'Outcome Status',
      render: (v: any) => {
        const statusMap: Record<string, string> = {
          admitted: 'active',
          rejected_used: 'paused',
          rejected_invalid: 'false',
          rejected_expired: 'false',
          rejected_wrong_exhibition: 'false',
          rejected_unknown: 'false',
        };
        const labelMap: Record<string, string> = {
          admitted: 'Admitted',
          rejected_used: 'Duplicate',
          rejected_invalid: 'Invalid Ticket',
          rejected_expired: 'Expired',
          rejected_wrong_exhibition: 'Wrong Event',
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

  // Handle empty active assigned exhibitions
  if (activeExhibitions.length === 0) {
    return (
      <ContentWrapper>
        <PageHeader title="Gate QR Scanner Terminal" description="Verify admission passes." showDivider />
        <div className="mx-auto max-w-lg mt-12 p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-center text-warning mb-4">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-50 mb-2">No Active Assigned Gate Shifts</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your staff account is currently not assigned to any active exhibition checkpoint gate. Please contact an admin.
          </p>
          <Button variant="secondary" onClick={loadDashboardData}>
            Refresh Terminal
          </Button>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title="Gate QR Scanner Terminal"
        description="Verify entrance QR credentials in real time. Prevents duplicate checks and forged passes."
        showDivider
      />

      {/* Statistics Shift summary cards */}
      <div className="grid gap-5 sm:grid-cols-3 mb-8">
        <StatCard
          title="Admitted Visitors Today"
          value={stats?.admittedCount || 0}
          icon="CheckCircle2"
        />
        <StatCard
          title="Total Scans Processed"
          value={stats?.totalScans || 0}
          icon="ScanLine"
        />
        <StatCard
          title="Security Flags Raised"
          value={stats?.securityFlags || 0}
          icon="ShieldAlert"
        />
      </div>

      {/* Scope Selector Bar */}
      <div className="mb-6 bg-gray-900 border border-gray-800 p-4 rounded-xl max-w-md">
        <Select
          label="Select Active Gate Exhibition Scope"
          value={selectedExhId}
          onChange={(e) => setSelectedExhId(e.target.value)}
          options={activeExhibitions.map((e) => ({ label: e.name, value: e.id }))}
        />
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
            <span>Gate Entrance Logs (Today)</span>
          </h3>
          <DataTable columns={columns} data={scans} />
        </div>
      </div>
    </ContentWrapper>
  );
}
