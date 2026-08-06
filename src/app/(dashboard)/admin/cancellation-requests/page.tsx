'use client';

import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import type { TableColumn } from '@/types/ui.types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { TableSkeleton } from '@/components/shared/skeletons';
import {
  FileX,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

interface CancellationRequestItem {
  id: string;
  requestId: string;
  saleId: string;
  transactionId: string;
  saleType: 'entry' | 'ride';
  exhibitionId?: { id?: string; name?: string };
  createdBy?: { id?: string; name?: string; staffId?: string; role?: string };
  reviewedBy?: { id?: string; name?: string; staffId?: string; role?: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  cancellationReason: string;
  note?: string;
  rejectionReason?: string;
  requestedAt: string;
  reviewedAt?: string;
  originalSaleAmount: number;
  ticketCount: number;
}

export default function CancellationRequestsPage() {
  const { addToast } = useToast();
  const { isSuperAdmin, hasPermission } = useAuth();

  const canApprove =
    isSuperAdmin ||
    hasPermission('canApproveTicketCancellation') ||
    hasPermission('canApproveEntryTicketCancellation') ||
    hasPermission('canApproveRideTicketCancellation');

  const [isLoading, setIsLoading] = React.useState(true);
  const [requests, setRequests] = React.useState<CancellationRequestItem[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'entry' | 'ride'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stats, setStats] = React.useState({ pendingCount: 0, pendingAmount: 0 });

  // Modal states
  const [approveModalItem, setApproveModalItem] = React.useState<CancellationRequestItem | null>(null);
  const [rejectModalItem, setRejectModalItem] = React.useState<CancellationRequestItem | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchRequests = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('saleType', typeFilter);

      const res = await fetch(`/api/cancellation-requests?${params.toString()}`);
      const body = await res.json();

      if (res.ok && body.success) {
        setRequests(body.data.requests || []);
        if (body.data.stats) {
          setStats(body.data.stats);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: body.error?.message || 'Failed to load cancellation requests.',
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
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, addToast]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async () => {
    if (!approveModalItem) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cancellation-requests/${approveModalItem.id}/approve`, {
        method: 'POST',
      });
      const body = await res.json();
      if (res.ok && body.success) {
        addToast({
          type: 'success',
          title: 'Approved',
          message: `Cancellation request ${approveModalItem.requestId} has been approved.`,
        });
        setApproveModalItem(null);
        fetchRequests();
      } else {
        addToast({
          type: 'error',
          title: 'Approval Failed',
          message: body.error?.message || 'Failed to approve request.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not connect to the server.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModalItem) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cancellation-requests/${rejectModalItem.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        addToast({
          type: 'info',
          title: 'Rejected',
          message: `Cancellation request ${rejectModalItem.requestId} rejected. Ticket remains active.`,
        });
        setRejectModalItem(null);
        setRejectionReason('');
        fetchRequests();
      } else {
        addToast({
          type: 'error',
          title: 'Rejection Failed',
          message: body.error?.message || 'Failed to reject request.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not connect to the server.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = React.useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase().trim();
    return requests.filter(
      (r) =>
        r.requestId.toLowerCase().includes(q) ||
        r.transactionId.toLowerCase().includes(q) ||
        (r.createdBy?.name || '').toLowerCase().includes(q) ||
        (r.createdBy?.staffId || '').toLowerCase().includes(q) ||
        r.cancellationReason.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const columns: TableColumn<CancellationRequestItem>[] = [
    {
      key: 'requestId',
      label: 'Request & Sale ID',
      render: (_: any, row: CancellationRequestItem) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-gray-200">{row.requestId}</span>
          <span className="font-mono text-[10px] text-accent-400 font-semibold">{row.transactionId}</span>
        </div>
      ),
    },
    {
      key: 'saleType',
      label: 'Type',
      render: (v: any) => (
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          v === 'ride' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
        }`}>
          {v === 'ride' ? 'Ride' : 'Entry'}
        </span>
      ),
    },
    {
      key: 'createdBy',
      label: 'Requested By',
      render: (v: any) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-200">{v?.name || 'Counter Staff'}</span>
          <span className="text-[10px] text-gray-500 font-mono">{v?.staffId || ''}</span>
        </div>
      ),
    },
    {
      key: 'originalSaleAmount',
      label: 'Amount / Qty',
      render: (_: any, row: CancellationRequestItem) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-gray-150">₹{row.originalSaleAmount / 100}</span>
          <span className="text-[10px] text-gray-400">{row.ticketCount} {row.ticketCount === 1 ? 'ticket' : 'tickets'}</span>
        </div>
      ),
    },
    {
      key: 'cancellationReason',
      label: 'Reason & Notes',
      render: (_: any, row: CancellationRequestItem) => (
        <div className="flex flex-col max-w-xs">
          <span className="text-xs font-medium text-gray-300">{row.cancellationReason}</span>
          {row.note && <span className="text-[10px] text-gray-400 italic">"{row.note}"</span>}
          {row.rejectionReason && (
            <span className="text-[10px] text-error italic">Rejection note: {row.rejectionReason}</span>
          )}
        </div>
      ),
    },
    {
      key: 'requestedAt',
      label: 'Requested At',
      render: (v: any) => (
        <span className="font-mono text-[11px] text-gray-400">
          {new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(v as string))}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: any) => {
        if (v === 'PENDING') {
          return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
              <Clock size={11} /> Pending
            </span>
          );
        }
        if (v === 'APPROVED') {
          return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle size={11} /> Approved
            </span>
          );
        }
        if (v === 'REJECTED') {
          return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <XCircle size={11} /> Rejected
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-gray-500/15 text-gray-400">
            {v}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: CancellationRequestItem) => {
        if (row.status !== 'PENDING') {
          return (
            <span className="text-[11px] text-gray-500 font-medium">
              {row.reviewedBy?.name ? `By ${row.reviewedBy.name}` : 'Processed'}
            </span>
          );
        }
        if (!canApprove) {
          return <span className="text-xs text-gray-500 font-medium">View Only</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setApproveModalItem(row)}
              className="text-[10px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRejectModalItem(row);
                setRejectionReason('');
              }}
              className="text-[10px] py-1 px-2.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold"
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <ContentWrapper>
      <PageHeader
        title="Ticket Cancellation Requests"
        description="Review, approve, and reject counter ticket cancellation requests requiring administrative authorization."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchRequests}
            isLoading={isLoading}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gray-900/60 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Clock size={16} /> Pending Authorization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100 font-mono">
              {stats.pendingCount}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Requests awaiting admin review
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/60 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <FileX size={16} /> Pending Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100 font-mono">
              ₹{(stats.pendingAmount / 100).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Total transaction value in queue
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/60 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CheckCircle size={16} /> Control Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-gray-200">
              Strict 30s Window
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Tickets remain active & gate-blocked until explicitly approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="text-xs"
            >
              {st}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800 text-xs">
            <Filter size={14} className="text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-transparent text-gray-200 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="entry">Entry Tickets</option>
              <option value="ride">Ride Tickets</option>
            </select>
          </div>

          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search ID, counter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs py-1.5"
            />
          </div>
        </div>
      </div>

      {/* Requests Data Table */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredRequests}
          emptyState={
            statusFilter === 'PENDING'
              ? 'No pending ticket cancellation requests.'
              : 'No cancellation requests found for selected filter.'
          }
        />
      )}

      {/* Approve Modal */}
      <Modal
        open={!!approveModalItem}
        onClose={() => setApproveModalItem(null)}
        title="Approve Ticket Cancellation"
      >
        {approveModalItem && (
          <div className="space-y-4">
            <div className="text-sm text-gray-300 space-y-2">
              <p>
                Are you sure you want to <span className="text-emerald-400 font-bold">APPROVE</span> cancellation of request{' '}
                <span className="font-mono text-gray-150 font-bold">{approveModalItem.requestId}</span>?
              </p>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="font-mono font-bold text-gray-200">{approveModalItem.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sale Amount:</span>
                  <span className="font-bold text-gray-100">₹{approveModalItem.originalSaleAmount / 100}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Requested By:</span>
                  <span className="text-gray-200">{approveModalItem.createdBy?.name || 'Counter Staff'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reason:</span>
                  <span className="text-gray-200">{approveModalItem.cancellationReason}</span>
                </div>
              </div>

              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded border border-rose-500/20">
                Action Effect: The sale and all associated tickets will be permanently soft-cancelled and voided.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-850">
              <Button
                variant="secondary"
                onClick={() => setApproveModalItem(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                isLoading={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModalItem}
        onClose={() => setRejectModalItem(null)}
        title="Reject Cancellation Request"
      >
        {rejectModalItem && (
          <div className="space-y-4">
            <div className="text-sm text-gray-300 space-y-2">
              <p>
                Reject cancellation request{' '}
                <span className="font-mono text-gray-150 font-bold">{rejectModalItem.requestId}</span>?
              </p>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="font-mono font-bold text-gray-200">{rejectModalItem.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sale Amount:</span>
                  <span className="font-bold text-gray-100">₹{rejectModalItem.originalSaleAmount / 100}</span>
                </div>
              </div>

              <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                Action Effect: The request will be rejected. The ticket will remain active and valid for entry/ride scanning.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Rejection Note (Optional)
              </label>
              <Input
                placeholder="Reason for rejecting cancellation..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-850">
              <Button
                variant="secondary"
                onClick={() => setRejectModalItem(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                isLoading={actionLoading}
                className="font-bold"
              >
                Reject Request
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ContentWrapper>
  );
}
