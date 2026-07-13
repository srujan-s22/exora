'use client';

import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { History, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RideScanHistoryPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Logs list states
  const [scans, setScans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);

  // Operator ride configuration context
  const [assignedRide, setAssignedRide] = React.useState<any>(null);
  const [outcomeFilter, setOutcomeFilter] = React.useState('');

  // Access Control gating
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'gate' && user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Load staff dashboard context to determine rideId scope
  const loadRideContext = React.useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/ride-stats?staffDashboard=true');
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data.assigned) {
          setAssignedRide(body.data.ride);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch ride scan logs
  const loadScansHistory = React.useCallback(async () => {
    if (!assignedRide) return;
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        rideId: assignedRide.id,
      });
      if (outcomeFilter) queryParams.append('result', outcomeFilter);

      const res = await fetch(`/api/rides/scans?${queryParams.toString()}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setScans(body.data.data || []);
          setTotalPages(body.data.pagination.totalPages || 1);
          setTotalItems(body.data.pagination.total || 0);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error Loading History',
          message: 'Failed to retrieve ride checkpoint scan logs.',
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
      setLoading(false);
    }
  }, [page, assignedRide, outcomeFilter, addToast]);

  React.useEffect(() => {
    if (user && (user.role === 'gate' || user.role === 'admin')) {
      loadRideContext();
    }
  }, [user, loadRideContext]);

  React.useEffect(() => {
    if (assignedRide) {
      loadScansHistory();
    }
  }, [assignedRide, page, outcomeFilter, loadScansHistory]);

  const columns = [
    {
      key: 'ticketId',
      label: 'Ticket Ref',
      render: (t: any) => <span className="font-mono font-bold">{t?.ticketNumber || 'UNKNOWN'}</span>,
    },
    {
      key: 'result',
      label: 'Scan Outcome',
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
      key: 'reason',
      label: 'Scanner details',
      render: (v: any) => <span className="text-gray-300 text-xs italic">{v || 'No details.'}</span>,
      className: 'max-w-[280px] truncate',
    },
    {
      key: 'scannedBy',
      label: 'Validated By',
      render: (s: any) => <span>{s?.name || 'Gate Operator'}</span>,
    },
    {
      key: 'scannedAt',
      label: 'Timestamp',
      render: (v: any) => (
        <span className="font-mono text-gray-400 text-xs">
          {new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'short',
            timeStyle: 'medium',
          }).format(new Date(v))}
        </span>
      ),
    },
  ];

  if (authLoading || (loading && !assignedRide)) {
    return (
      <ContentWrapper>
        <div className="flex h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      </ContentWrapper>
    );
  }

  if (!assignedRide) {
    return (
      <ContentWrapper>
        <div className="mx-auto max-w-lg mt-12 p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
          <History size={48} className="text-warning-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-50 mb-2">No History Scope Available</h2>
          <p className="text-sm text-gray-400 mb-6">
            You must be assigned to an active ride to view scan history logs.
          </p>
          <Link href="/ride" passHref>
            <Button variant="secondary" className="font-semibold text-xs mx-auto">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <div className="flex items-center gap-4 mb-4">
        <Link href="/ride" passHref>
          <Button variant="secondary" size="sm" className="p-2 shrink-0">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <PageHeader
            title={`${assignedRide.name} - Scan Logs`}
            description="View validation check history and duplicate block logs at this terminal."
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-900 border border-gray-800 p-4 rounded-xl items-end">
        <div className="w-full md:w-1/3">
          <Select
            label="Scan Outcome Filter"
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Scan Results', value: '' },
              { label: 'Admitted Entries', value: 'admitted' },
              { label: 'Duplicate Entry Blocks', value: 'rejected_used' },
              { label: 'Wrong Ride Attempts', value: 'rejected_wrong_ride' },
              { label: 'Invalid Pass Scans', value: 'rejected_invalid' },
              { label: 'Suspicious / Forged QR', value: 'rejected_unknown' },
            ]}
          />
        </div>
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={loadScansHistory}
          leftIcon={<RefreshCw size={14} />}
          isLoading={loading}
          className="font-semibold text-xs"
        >
          Refresh Logs
        </Button>
      </div>

      {/* Table grid */}
      {loading ? (
        <div className="flex h-[35dvh] items-center justify-center bg-gray-900 border border-gray-800 rounded-xl p-8">
          <Spinner className="text-accent-500" />
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center bg-gray-900 border border-gray-800 rounded-xl p-12">
          <p className="text-gray-400">No ticket entrance scans matching filter criteria found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable columns={columns} data={scans} />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-850 pt-4">
              <span className="text-xs text-gray-400">
                Page {page} of {totalPages} ({totalItems} total scan records)
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
    </ContentWrapper>
  );
}
