'use client';

import * as React from 'react';
import { History, AlertCircle, RefreshCw, ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

  // Gating check-in operators
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'gate' && user.role !== 'admin' && user.role !== 'super_admin') {
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
    if (user && (user.role === 'gate' || user.role === 'admin' || user.role === 'super_admin')) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

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
      label: 'Customer Name',
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
      key: 'scannedBy',
      label: 'Gate Staff',
      render: (v: any) => (
        <span className="text-xs text-gray-300">
          {v?.name ? `${v.name} (${v.staffId || ''})` : 'Gate Operator'}
        </span>
      ),
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
        <PageHeader title="Gate Checkpoint Dashboard" description="Verify visitor ticket QR codes and control turnstile admission." showDivider />
        <div className="grid gap-5 sm:grid-cols-3 mb-8">
          <StatCard title="Admitted Passes (Today)" value="—" icon="CheckCircle2" isLoading />
          <StatCard title="Total Scans Executed" value="—" icon="ScanLine" isLoading />
          <StatCard title="Security Rejections" value="—" icon="ShieldAlert" isLoading />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="p-6 border border-gray-800 bg-gray-900 space-y-4">
              <div className="h-4 w-36 skeleton" />
              <div className="h-44 w-full rounded-xl skeleton" />
              <div className="h-10 w-full rounded-lg skeleton" />
            </Card>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-4">
              <div className="h-4 w-40 skeleton" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center py-2 border-t border-gray-850">
                  <div className="h-4 w-24 skeleton" />
                  <div className="h-4 flex-1 skeleton" />
                  <div className="h-4 w-16 skeleton" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // Handle empty active assigned exhibitions
  if (activeExhibitions.length === 0) {
    return (
      <ContentWrapper>
        <PageHeader title="Gate Checkpoint Dashboard" description="Verify admission passes." showDivider />
        <div className="mx-auto max-w-lg mt-12 p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex justify-center text-warning mb-4">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-50 mb-2">No Active Assigned Gate Shifts</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your staff account is currently not assigned to any active exhibition checkpoint gate. Please contact an admin.
          </p>
          <Button variant="secondary" onClick={loadDashboardData} leftIcon={<RefreshCw size={14} />}>
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
        title="Gate Checkpoint Dashboard"
        description="Shift summary and entrance check-in activity."
        showDivider
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/gate/scan')}
            leftIcon={<ScanLine size={18} />}
            className="font-bold shadow-lg shadow-accent-500/20"
          >
            Launch Gate Scanner Terminal
          </Button>
        }
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

      {/* Scope Selector & Quick Action Bar */}
      <div className="mb-8 bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <Select
            label="Active Gate Exhibition Scope"
            value={selectedExhId}
            onChange={(e) => setSelectedExhId(e.target.value)}
            options={activeExhibitions.map((e) => ({ label: e.name, value: e.id }))}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push('/gate/scan')}
          leftIcon={<ScanLine size={14} />}
          className="font-bold text-xs w-full sm:w-auto"
        >
          Scan Tickets
        </Button>
      </div>

      {/* Terminal Launch Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border border-accent-500/20 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-accent-500/10 border border-accent-500/30 flex items-center justify-center text-accent-400 shrink-0">
            <ScanLine size={28} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-100">Ready for Entrance Verification?</h3>
            <p className="text-xs text-gray-400 mt-1">Open the dedicated full-screen camera terminal to scan entrance ticket passes.</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/gate/scan')}
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
          <span>Recent Entrance Checkpoint Logs</span>
        </h3>
        <DataTable columns={columns} data={scans} />
      </div>
    </ContentWrapper>
  );
}
