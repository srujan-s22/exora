'use client';

import * as React from 'react';
import { Search, Calendar, Filter, RefreshCw, Key, Ticket, ScanLine, AlertCircle, Settings, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';

export default function AuditLogsPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [pagination, setPagination] = React.useState<any>({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0,
    hasMore: false,
  });

  // Query parameters state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [actionFilter, setActionFilter] = React.useState('all');
  const [searchStaff, setSearchStaff] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      if (actionFilter !== 'all') {
        params.append('action', actionFilter);
      }
      if (searchStaff.trim()) {
        params.append('performedBy', searchStaff.trim());
      }
      if (startDate) {
        params.append('startDate', new Date(startDate).toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append('endDate', end.toISOString());
      }

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setLogs(body.data.data || []);
          setPagination(body.data.pagination || {
            page: currentPage,
            limit: 20,
            totalPages: 1,
            total: 0,
            hasMore: false,
          });
        }
      } else {
        const body = await res.json();
        addToast({
          type: 'error',
          title: 'Logs Retrieval Failed',
          message: body.error?.message || 'Could not fetch audit logs from database.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not connect to the audit API.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, actionFilter, searchStaff, startDate, endDate, addToast]);

  React.useEffect(() => {
    fetchLogs();
  }, [currentPage, fetchLogs]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setActionFilter('all');
    setSearchStaff('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Icon selector based on action
  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('login') || act.includes('logout')) return <Key size={14} className="text-info" />;
    if (act.includes('ticket.create') || act.includes('sale.')) return <Ticket size={14} className="text-success" />;
    if (act.includes('scan') || act.includes('validate')) return <ScanLine size={14} className="text-accent-300" />;
    if (act.includes('settings')) return <Settings size={14} className="text-gray-400" />;
    return <FileText size={14} className="text-warning" />;
  };

  // Timestamp formater
  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  };

  // Details formatter
  const formatDetails = (details: any) => {
    if (!details) return '—';
    if (typeof details === 'string') return details;

    try {
      // Handle update changes object
      if (details.changes) {
        const changesObj = details.changes;
        const parts = Object.entries(changesObj).map(([key, value]: [string, any]) => {
          if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
            const fromVal = value.from === null || value.from === undefined || value.from === '' ? 'none' : String(value.from);
            const toVal = value.to === null || value.to === undefined || value.to === '' ? 'none' : String(value.to);
            return `${key} (${fromVal} → ${toVal})`;
          }
          return key;
        });
        return `Changes: ${parts.join(', ')}`;
      }

      // Handle user creation details
      if (details.staffId) {
        const roleStr = details.role ? ` as ${details.role}` : '';
        const superStr = details.isSuperAdmin ? ' (Super Admin)' : '';
        return `Created ${details.name || 'user'} (${details.staffId})${roleStr}${superStr}`;
      }

      return JSON.stringify(details);
    } catch (e) {
      return 'Error parsing details';
    }
  };

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title="Audit Logs History"
        description="Chronological record of all actions performed by administrators, gate scanners, and counter operators."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogs}
            isLoading={isLoading}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh Log
          </Button>
        }
        showDivider
      />

      {/* Query Filter Toolbar */}
      <Card className="mb-6 border border-gray-800 bg-gray-900 shadow-sm">
        <CardHeader className="py-3 border-b border-gray-850">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Filter size={13} className="text-accent-300" />
            <span>Audit Search Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleApplyFilters} className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div>
              <Select
                label="Action Scope"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                options={[
                  { label: 'All Actions', value: 'all' },
                  { label: 'User Login', value: 'user.login' },
                  { label: 'Exhibition Setup', value: 'exhibition.create' },
                  { label: 'Exhibition Update', value: 'exhibition.update' },
                  { label: 'Counter Ticket Sale', value: 'sale.create' },
                  { label: 'Gate Ticket Scan', value: 'ticket.validate' },
                  { label: 'Ticket Generation', value: 'ticket.create' },
                ]}
              />
            </div>
            <div>
              <Input
                label="Performed By (Staff ID)"
                placeholder="e.g. 64b8f... or admin"
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1 text-xs py-2">
                Apply Filters
              </Button>
              <Button type="button" variant="secondary" onClick={handleResetFilters} className="text-xs py-2">
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table Card */}
      <Card className="border border-gray-800 bg-gray-900 shadow-lg">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="md" className="text-accent-300" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <AlertCircle size={32} className="mx-auto text-gray-600 mb-2.5" />
              <p className="text-sm font-semibold">No audit logs matching search parameters.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-850">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-850/50 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4.5">Timestamp</th>
                    <th className="px-6 py-4.5">Staff Name</th>
                    <th className="px-6 py-4.5">Role</th>
                    <th className="px-6 py-4.5">Action Event</th>
                    <th className="px-6 py-4.5">Details</th>
                    <th className="px-6 py-4.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850 font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-850/15 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-150 block">{log.performedBy?.name || 'System'}</span>
                        <span className="text-[10px] text-gray-500 font-mono">ID: {log.performedBy?.staffId || log.performedBy || 'System'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider
                          ${log.performedByRole === 'admin' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : ''}
                          ${log.performedByRole === 'counter' ? 'bg-success/10 text-success border border-success/20' : ''}
                          ${log.performedByRole === 'gate' ? 'bg-info/10 text-info border border-info/20' : ''}
                        `}>
                          {log.performedByRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 font-mono text-accent-300 text-[11px]">
                          {getActionIcon(log.action)}
                          <span>{log.action}</span>
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4 max-w-sm truncate text-gray-300"
                        title={typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                      >
                        {formatDetails(log.details)}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-500 whitespace-nowrap">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination controls */}
              <div className="flex items-center justify-between p-4 bg-gray-900/60 print:hidden text-xs">
                <span className="text-gray-400">
                  Showing <span className="font-bold text-gray-200">{logs.length}</span> log records (Total: {pagination.total})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 mr-2">
                    Page <span className="font-bold text-gray-200">{pagination.page}</span> of {pagination.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    leftIcon={<ChevronLeft size={14} />}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!pagination.hasMore}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    rightIcon={<ChevronRight size={14} />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ContentWrapper>
  );
}
