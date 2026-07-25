'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Gamepad2, Play, Square, History, RefreshCw, AlertCircle, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';

export default function RideStaffDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [dataLoading, setDataLoading] = React.useState(true);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

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

  const columns = [
    {
      key: 'ticketNumber',
      label: 'Ticket Ref',
      render: (v: any, row: any) => (
        <div className="font-mono text-xs font-bold text-gray-200">
          {v || row.ticketId?.ticketNumber || 'N/A'}
        </div>
      ),
    },
    {
      key: 'customerName',
      label: 'Rider Name',
      render: (v: any, row: any) => (
        <span className="text-xs text-gray-300 font-medium">{v || row.ticketId?.customerName || 'Walk-in Visitor'}</span>
      ),
    },
    {
      key: 'result',
      label: 'Scan Status',
      render: (v: any) => {
        const isAdmitted = v === 'admitted';
        return <StatusIndicator status={isAdmitted ? 'active' : 'archived'} />;
      },
    },
    {
      key: 'scannedAt',
      label: 'Scanned At',
      render: (v: any) => (
        <span className="font-mono text-gray-400 text-xs">
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

  if (!dashboardData || !dashboardData.assigned) {
    return (
      <ContentWrapper>
        <PageHeader title="Ride Operator Dashboard" description="Ride checkpoint operations." showDivider />
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

  const { ride, validCount, invalidCount, totalScansToday, recentScans } = dashboardData;

  return (
    <ContentWrapper>
      {/* Page Header with Launch Scanner Button */}
      <PageHeader
        title={`Ride Dashboard: ${ride.name}`}
        description="Shift summary and entrance activity for your assigned ride."
        showDivider
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/ride/scan')}
            leftIcon={<ScanLine size={18} />}
            className="font-bold shadow-lg shadow-accent-500/20"
          >
            Launch Ride Scanner Terminal
          </Button>
        }
      />

      {/* Statistics summary cards */}
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

      {/* Ride Operational Status & Actions */}
      <div className="mb-8 bg-gray-900 border border-gray-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gray-850 border border-gray-800 flex items-center justify-center text-accent-400 shrink-0">
            <Gamepad2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-gray-100">{ride.name}</span>
              <StatusIndicator status={ride.status === 'open' ? 'active' : 'paused'} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Price: ₹{ride.price / 100} / rider</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant={ride.status === 'open' ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggleStatus}
            disabled={isActionLoading}
            leftIcon={ride.status === 'open' ? <Square size={14} /> : <Play size={14} />}
            className="font-bold text-xs flex-1 md:flex-none"
          >
            {ride.status === 'open' ? 'Close Ride Queue' : 'Open Ride Queue'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/ride/scan')}
            leftIcon={<ScanLine size={14} />}
            className="font-bold text-xs flex-1 md:flex-none shadow-md"
          >
            Scan Ride Tickets
          </Button>
        </div>
      </div>

      {/* Terminal Launch Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border border-accent-500/20 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-accent-500/10 border border-accent-500/30 flex items-center justify-center text-accent-400 shrink-0">
            <ScanLine size={28} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-100">Ready to Scan & Admit Riders?</h3>
            <p className="text-xs text-gray-400 mt-1">Open the dedicated camera terminal to scan ride ticket bundle QRs.</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/ride/scan')}
          leftIcon={<ScanLine size={18} />}
          className="shrink-0 font-extrabold shadow-lg shadow-accent-500/20 cursor-pointer"
        >
          Open Dedicated Terminal
        </Button>
      </div>

      {/* Scan Log Feed */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 select-none flex items-center gap-2">
          <History size={15} className="text-gray-500" />
          <span>Ride Entrance Logs (Today)</span>
        </h3>
        <DataTable columns={columns} data={recentScans || []} />
      </div>
    </ContentWrapper>
  );
}
