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
import { History, RefreshCw } from 'lucide-react';

export default function GateScanHistoryPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Logs list states
  const [scans, setScans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);

  // Filters
  const [exhibitions, setExhibitions] = React.useState<any[]>([]);
  const [exhibitionId, setExhibitionId] = React.useState('');
  const [outcomeFilter, setOutcomeFilter] = React.useState('');

  // Access Control gating
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'gate' && user.role !== 'admin' && user.role !== 'super_admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Load exhibitions dropdown options
  const loadExhibitions = React.useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/gate');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setExhibitions(body.data.activeExhibitions || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch scan logs
  const loadScansHistory = React.useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (exhibitionId) queryParams.append('exhibitionId', exhibitionId);
      if (outcomeFilter) queryParams.append('result', outcomeFilter);

      const res = await fetch(`/api/tickets/scans?${queryParams.toString()}`);
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
          title: 'Error Loading Scans',
          message: 'Failed to fetch gate scanning history logs.',
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
  }, [page, exhibitionId, outcomeFilter, addToast]);

  React.useEffect(() => {
    if (user && (user.role === 'gate' || user.role === 'admin' || user.role === 'super_admin')) {
      loadExhibitions();
      loadScansHistory();
    }
  }, [user, page, exhibitionId, outcomeFilter, loadExhibitions, loadScansHistory]);

  const columns = [
    {
      key: 'ticketId',
      label: 'Ticket Ref',
      render: (t: any) => <span className="font-mono font-bold">{t?.ticketNumber || 'UNKNOWN'}</span>,
    },
    {
      key: 'result',
      label: 'Outcome',
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
      key: 'reason',
      label: 'Detail Message',
      render: (v: any) => <span className="text-gray-300 text-xs italic">{v || 'No details provided.'}</span>,
      className: 'max-w-[280px] truncate',
    },
    {
      key: 'scannedBy',
      label: 'Scanned By',
      render: (s: any) => <span>{s?.name || 'Gate Operator'}</span>,
    },
    {
      key: 'scannedAt',
      label: 'Scan Time',
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

  if (authLoading) {
    return (
      <ContentWrapper>
        <div className="flex h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <PageHeader
        title="Gate entrance checks logs"
        description="Search past validation attempts and inspect duplicate attempt statistics."
        showDivider
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-900 border border-gray-800 p-4 rounded-xl items-end">
        <div className="w-full md:w-1/3">
          <Select
            label="Filter by Exhibition"
            value={exhibitionId}
            onChange={(e) => {
              setExhibitionId(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Exhibitions', value: '' },
              ...exhibitions.map((e) => ({ label: e.name, value: e.id })),
            ]}
          />
        </div>
        <div className="w-full md:w-1/4">
          <Select
            label="Outcome Filter"
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Scan Results', value: '' },
              { label: 'Admitted Entry Only', value: 'admitted' },
              { label: 'Duplicate Entry Blocks', value: 'rejected_used' },
              { label: 'Invalid Signature', value: 'rejected_invalid' },
              { label: 'Wrong Exhibition', value: 'rejected_wrong_exhibition' },
              { label: 'Forged QR codes', value: 'rejected_unknown' },
            ]}
          />
        </div>
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={loadScansHistory}
          leftIcon={<RefreshCw size={14} />}
          isLoading={loading}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Log Feed Table */}
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
