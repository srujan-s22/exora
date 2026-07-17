'use client';

import * as React from 'react';
import {
  KeyRound, Filter, Clock, CheckCircle2, XCircle,
  Shield, Plus, AlertTriangle, Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { Card, CardTitle } from '@/components/ui/card';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import type { TableColumn, BadgeVariant } from '@/types/ui.types';
import type { PasswordResetRequest } from '@/types/password-reset.types';
import type { PaginationMeta } from '@/types/api.types';

const statusVariant: Record<string, BadgeVariant> = {
  pending: 'warning',
  approved: 'info',
  completed: 'success',
  rejected: 'error',
};

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock size={10} />,
  approved: <Shield size={10} />,
  completed: <CheckCircle2 size={10} />,
  rejected: <XCircle size={10} />,
};

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PasswordResetsPage() {
  const { addToast } = useToast();
  const { user, isSuperAdmin, hasPermission } = useAuth();

  const [requests, setRequests] = React.useState<PasswordResetRequest[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false,
  });
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Super Admin action modals
  const [approveModalRequest, setApproveModalRequest] = React.useState<PasswordResetRequest | null>(null);
  const [rejectModalRequest, setRejectModalRequest] = React.useState<PasswordResetRequest | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Admin completion modal
  const [completeModalRequest, setCompleteModalRequest] = React.useState<PasswordResetRequest | null>(null);
  const [resetPassword, setResetPassword] = React.useState('');
  const [completeError, setCompleteError] = React.useState('');

  // Request modal (for admins)
  const [showRequestModal, setShowRequestModal] = React.useState(false);
  const [requestPhone, setRequestPhone] = React.useState('');
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [showRedFlash, setShowRedFlash] = React.useState(false);

  const fetchRequests = React.useCallback(async () => {
    if (!isSuperAdmin && !hasPermission('canResetPasswords')) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/password-resets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const body = await res.json();
      if (body.success) {
        setRequests(body.data);
        setPagination(body.meta.pagination);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error loading requests', message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, addToast, isSuperAdmin, hasPermission]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Approve request (Super Admin)
  const handleApprove = async () => {
    if (!approveModalRequest) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/password-resets/${approveModalRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to approve');

      setApproveModalRequest(null);
      fetchRequests();
      addToast({ type: 'success', title: 'Request approved', message: 'The request is approved. The admin can now change the password.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Approval failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject request (Super Admin)
  const handleReject = async () => {
    if (!rejectModalRequest) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/password-resets/${rejectModalRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to reject');

      setRejectModalRequest(null);
      setRejectReason('');
      fetchRequests();
      addToast({ type: 'success', title: 'Request rejected', message: 'The password reset has been denied.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Rejection failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Complete reset (Admin with permission)
  const handleCompleteReset = async () => {
    if (!completeModalRequest) return;

    if (!resetPassword) {
      setCompleteError('Password is required');
      return;
    }
    if (resetPassword.length < 8) {
      setCompleteError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(resetPassword)) {
      setCompleteError('Must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(resetPassword)) {
      setCompleteError('Must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(resetPassword)) {
      setCompleteError('Must contain at least one number');
      return;
    }

    setCompleteError('');
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/password-resets/${completeModalRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          password: resetPassword,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to complete reset');

      setCompleteModalRequest(null);
      setResetPassword('');
      fetchRequests();
      addToast({ type: 'success', title: 'Password changed', message: `Password for ${completeModalRequest.targetName || completeModalRequest.targetStaffId} has been successfully updated.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to set password', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Create request (admin)
  const handleCreateRequest = async () => {
    if (!requestPhone.trim()) return;
    setIsRequesting(true);
    try {
      const res = await fetch('/api/password-resets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPhoneNumber: requestPhone }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        if (body.error?.code === 'TARGET_IS_SUPER_ADMIN') {
          setShowRequestModal(false);
          setRequestPhone('');
          setShowRedFlash(true);
          if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate([100, 50, 100, 50, 200]);
          }
          return;
        }
        throw new Error(body.error?.message || 'Failed to create request');
      }

      setShowRequestModal(false);
      setRequestPhone('');
      fetchRequests();
      addToast({ type: 'success', title: 'Request submitted', message: 'Awaiting super admin approval.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Request failed', message: err.message });
    } finally {
      setIsRequesting(false);
    }
  };

  const columns: TableColumn<PasswordResetRequest>[] = [
    {
      key: 'targetStaffId',
      label: 'Target Staff',
      render: (_val, row) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-accent-400">{row.targetStaffId}</p>
          {row.targetName && <p className="text-[10px] text-gray-500 truncate">{row.targetName}</p>}
        </div>
      ),
    },
    {
      key: 'targetPhoneNumber',
      label: 'Phone',
      render: (_val, row) => (
        <span className="text-xs text-gray-400 font-mono">{row.targetPhoneNumber}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_val, row) => (
        <Badge variant={statusVariant[row.status] || 'default'}>
          {statusIcon[row.status]}
          <span className="ml-1">{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</span>
        </Badge>
      ),
    },
    {
      key: 'requestedByName' as any,
      label: 'Requested By',
      render: (_val, row) => (
        <div className="min-w-0">
          <p className="text-xs text-gray-300">{row.requestedByName || '—'}</p>
          {row.requestedByStaffId && <p className="text-[10px] text-gray-500 font-mono">{row.requestedByStaffId}</p>}
        </div>
      ),
    },
    {
      key: 'requestedAt',
      label: 'Requested',
      render: (_val, row) => (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDate(row.requestedAt)}
        </span>
      ),
    },
    {
      key: 'actions' as any,
      label: '',
      className: 'w-32',
      render: (_val: any, row: PasswordResetRequest) => {
        const canApprove = row.status === 'pending' && isSuperAdmin;
        const canComplete = row.status === 'approved' && (isSuperAdmin || user?.permissions?.canResetPasswords);

        if (!canApprove && !canComplete) return null;

        return (
          <div className="flex items-center gap-1.5">
            {canApprove && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  className="h-7 px-2.5 text-[10px]"
                  onClick={() => setApproveModalRequest(row)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  className="h-7 px-2.5 text-[10px]"
                  onClick={() => setRejectModalRequest(row)}
                >
                  Reject
                </Button>
              </>
            )}
            {canComplete && (
              <Button
                size="sm"
                variant="primary"
                className="h-7 px-2.5 text-[10px]"
                onClick={() => setCompleteModalRequest(row)}
              >
                Set Password
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved (Awaiting Password)', value: 'approved' },
    { label: 'Completed', value: 'completed' },
    { label: 'Rejected', value: 'rejected' },
  ];

  if (!isSuperAdmin && !hasPermission('canResetPasswords')) {
    return (
      <ContentWrapper>
        <div className="flex flex-col items-center justify-center flex-grow py-16">
          <Card className="max-w-md w-full border border-red-900/30 bg-red-950/10 backdrop-blur-sm p-8 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-5 border border-red-500/20">
              <AlertTriangle size={28} />
            </div>
            <CardTitle className="text-xl font-bold text-gray-50 mb-3">Access Denied</CardTitle>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              You do not have the required permission to access password resets. Please contact a super administrator to request access.
            </p>
            <Button
              variant="secondary"
              onClick={() => window.history.back()}
              className="w-full font-semibold"
            >
              Go Back
            </Button>
          </Card>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <>
      <div className="space-y-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-50">Password Reset Requests</h1>
            <p className="mt-1 text-sm text-gray-400">
              {isSuperAdmin
                ? 'Review and approve/reject password reset requests, or complete approved resets.'
                : 'Submit password reset requests and configure new passwords once approved by super admins.'}
            </p>
          </div>
          {(isSuperAdmin || user?.permissions?.canResetPasswords) && (
            <Button
              className="shrink-0 flex items-center gap-1.5 font-semibold"
              onClick={() => setShowRequestModal(true)}
            >
              <Plus size={16} />
              <span>New Reset Request</span>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
            <Filter size={12} className="text-accent-400" />
            <span>Filter</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={statusOptions}
              className="w-full"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <KeyRound size={13} className="text-accent-500" />
            <span className="font-semibold text-gray-200">{pagination.total.toLocaleString()}</span> requests
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <Spinner size="lg" className="text-accent-500" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-xl bg-gray-900/10 p-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-500 mb-4 select-none">
              <KeyRound size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-200">No Reset Requests</h3>
            <p className="mt-1 text-sm text-gray-400 max-w-sm">
              {statusFilter
                ? 'No requests match the current filter.'
                : 'No password reset requests have been submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <DataTable columns={columns} data={requests} />
            {pagination.totalPages > 1 && (
              <div className="pt-4 border-t border-gray-850">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      <Modal
        open={!!approveModalRequest}
        onClose={() => setApproveModalRequest(null)}
        title="Approve Reset Request"
        description={`Are you sure you want to approve the password reset request for ${approveModalRequest?.targetName || approveModalRequest?.targetStaffId}?`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-gray-300">
              Approving this allows the requesting administrator to set a new password. The super admin role will not set or know the password.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setApproveModalRequest(null)}>
              Cancel
            </Button>
            <Button size="sm" isLoading={isProcessing} onClick={handleApprove}>
              <CheckCircle2 size={14} className="mr-1" />
              Approve Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Reset Modal (Admin sets password) */}
      <Modal
        open={!!completeModalRequest}
        onClose={() => { setCompleteModalRequest(null); setResetPassword(''); setCompleteError(''); }}
        title="Set New Password"
        description={`Set a new custom password for ${completeModalRequest?.targetName || completeModalRequest?.targetStaffId}.`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="New Password"
            placeholder="Min 8 characters, uppercase, lowercase, number"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            error={completeError}
            leftIcon={<Key size={14} />}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => { setCompleteModalRequest(null); setResetPassword(''); setCompleteError(''); }}>
              Cancel
            </Button>
            <Button size="sm" isLoading={isProcessing} onClick={handleCompleteReset}>
              <CheckCircle2 size={14} className="mr-1" />
              Save Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModalRequest}
        onClose={() => { setRejectModalRequest(null); setRejectReason(''); }}
        title="Reject Password Reset"
        description={`Reject the reset request for ${rejectModalRequest?.targetName || rejectModalRequest?.targetStaffId}?`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Reason (Optional)"
            placeholder="Why is this request being rejected?"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => { setRejectModalRequest(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" isLoading={isProcessing} onClick={handleReject}>
              <XCircle size={14} className="mr-1" />
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Request Modal (for admins) */}
      <Modal
        open={showRequestModal}
        onClose={() => { setShowRequestModal(false); setRequestPhone(''); }}
        title="Request Password Reset"
        description="Enter the staff member's registered phone number to submit a reset request."
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Staff Phone Number"
            placeholder="10-digit mobile number"
            value={requestPhone}
            onChange={(e) => setRequestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
          <p className="text-xs text-gray-500">
            This request will be sent to the super admin for approval. You&apos;ll be notified of the outcome.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowRequestModal(false); setRequestPhone(''); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={isRequesting}
              onClick={handleCreateRequest}
              disabled={!requestPhone || requestPhone.length !== 10}
            >
              <KeyRound size={14} className="mr-1" />
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Red Security Alert Overlay (Target is Super Admin) */}
      {showRedFlash && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-950/95 backdrop-blur-md transition-all duration-300">
          <div className="text-center p-8 max-w-md mx-auto space-y-6 animate-pulse">
            <div className="h-24 w-24 rounded-3xl bg-red-500 text-white flex items-center justify-center mx-auto shadow-[0_0_80px_rgba(239,68,68,0.75)] border-2 border-red-300">
              <Shield size={52} className="animate-bounce" />
            </div>
            <h2 className="text-4xl font-extrabold text-red-500 tracking-wider">SECURITY VIOLATION</h2>
            <p className="text-white text-base font-bold leading-relaxed">
              UNAUTHORIZED ACCESS ATTEMPT DETECTED!
            </p>
            <p className="text-gray-300 text-xs leading-relaxed">
              You are not permitted to request or initiate password changes for a SUPER ADMINISTRATOR account. This incident has been logged.
            </p>
            <Button
              variant="danger"
              size="md"
              className="w-full font-bold shadow-[0_0_30px_rgba(239,68,68,0.5)] h-12 uppercase tracking-wide text-xs"
              onClick={() => setShowRedFlash(false)}
            >
              Acknowledge & Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
