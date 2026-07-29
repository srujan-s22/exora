'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Plus, X, Filter, Ticket, Eye, IndianRupee, QrCode, ShieldCheck, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/providers/toast-provider';
import { TableSkeleton } from '@/components/shared/skeletons';
import type { Ticket as TicketType } from '@/types/ticket.types';
import type { Exhibition } from '@/types/exhibition.types';
import type { PaginationMeta } from '@/types/api.types';
import type { TableColumn, BadgeVariant } from '@/types/ui.types';

const statusVariant: Record<string, BadgeVariant> = {
  valid: 'success',
  used: 'info',
  cancelled: 'error',
  expired: 'warning',
};

function formatPrice(paise: number): string {
  if (paise === 0) return 'Free';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminTicketsPage() {
  const { addToast } = useToast();
  const [tickets, setTickets] = React.useState<TicketType[]>([]);
  const [exhibitions, setExhibitions] = React.useState<Exhibition[]>([]);
  const [summaryStats, setSummaryStats] = React.useState({
    totalTickets: 0,
    totalRevenue: 0,
    validCount: 0,
    usedCount: 0,
  });

  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  const [exhibitionId, setExhibitionId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [ticketType, setTicketType] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch exhibitions for the filter dropdown
  React.useEffect(() => {
    async function loadExhibitions() {
      try {
        const res = await fetch('/api/exhibitions?limit=100&includeArchived=false');
        if (!res.ok) return;
        const body = await res.json();
        if (body.success) {
          setExhibitions(body.data.data || body.data);
        }
      } catch {
        // Silent fail — exhibition filter just won't populate
      }
    }
    loadExhibitions();
  }, []);

  // Fetch tickets & stats
  const fetchTickets = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (exhibitionId) queryParams.append('exhibitionId', exhibitionId);
      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (status) queryParams.append('status', status);
      if (ticketType) queryParams.append('ticketType', ticketType);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await fetch(`/api/tickets?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');

      const body = await res.json();
      if (body.success) {
        setTickets(body.data.data);
        setPagination(body.data.pagination);
        if (body.data.stats) {
          setSummaryStats(body.data.stats);
        }
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error loading tickets',
        message: err.message || 'Please check your connection.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, exhibitionId, debouncedSearch, status, ticketType, startDate, endDate, addToast]);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setTicketType('');
    setExhibitionId('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasFilters = search || status || ticketType || exhibitionId || startDate || endDate;

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Valid', value: 'valid' },
    { label: 'Used', value: 'used' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Expired', value: 'expired' },
  ];

  const exhibitionOptions = [
    { label: 'All Exhibitions', value: '' },
    ...exhibitions.map((e) => ({ label: e.name, value: e.id })),
  ];

  const columns: TableColumn<TicketType>[] = [
    {
      key: 'ticketNumber',
      label: 'Ticket #',
      render: (_val, row) => (
        <Link
          href={`/admin/tickets/${row.id}`}
          className="font-mono text-accent-400 hover:text-accent-300 transition-colors font-semibold text-xs tracking-wide"
        >
          {row.ticketNumber}
        </Link>
      ),
    },
    {
      key: 'ticketType',
      label: 'Class',
      render: (_val, row) => (
        <span className="text-gray-200 font-medium capitalize">{row.ticketType}</span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      render: (_val, row) => (
        <span className="text-gray-300 font-mono text-xs">{formatPrice(row.price)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_val, row) => (
        <Badge variant={statusVariant[row.status] || 'default'}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (_val, row) => (
        <span className="text-gray-400 text-xs capitalize">{row.paymentMethod}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (_val, row) => (
        <span className="text-gray-300 text-xs truncate max-w-[140px] inline-block">
          {row.customerName || '—'}
        </span>
      ),
    },
    {
      key: 'soldAt',
      label: 'Sold At',
      render: (_val, row) => (
        <span className="text-gray-400 text-xs whitespace-nowrap">{formatDate(row.soldAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-10 text-right',
      render: (_val, row) => (
        <Link
          href={`/admin/tickets/${row.id}`}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-accent-400 hover:bg-gray-800 transition-colors"
          title="View ticket details"
        >
          <Eye size={15} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-50 flex items-center gap-2">
            <Ticket className="text-accent-400" />
            <span>Tickets Admin Console</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Browse, search, view details, and track real-time ticketing analytics across exhibitions.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/tickets/new" passHref>
            <Button className="shrink-0 flex items-center gap-1.5 font-semibold">
              <Plus size={16} />
              <span>Generate Tickets</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Exhibition Scope & Search/Date Filters */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
            <Filter size={14} className="text-accent-400" />
            <span>Exhibition Scope & Date Filters</span>
          </div>
          {hasFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 px-2.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
            >
              <X size={12} />
              <span>Clear Filters</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Input
              placeholder="Search ticket #, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              className="w-full h-10"
            />
          </div>

          <div>
            <Select
              value={exhibitionId}
              onChange={(e) => { setExhibitionId(e.target.value); setCurrentPage(1); }}
              options={exhibitionOptions}
              className="w-full h-10"
            />
          </div>

          <div>
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
              options={statuses}
              className="w-full h-10"
            />
          </div>

          <div>
            <div className="relative">
              <Input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full h-10 text-xs"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full h-10 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Ticket Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-accent-500/10 rounded-lg text-accent-400 border border-accent-500/20">
              <Ticket size={24} />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium">Total Tickets</span>
              <h3 className="text-2xl font-bold text-gray-150 mt-1">{summaryStats.totalTickets}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-lg text-success border border-success/20">
              <IndianRupee size={24} />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium">Total Ticket Revenue</span>
              <h3 className="text-2xl font-bold text-gray-150 mt-1">
                ₹{(summaryStats.totalRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-warning/10 rounded-lg text-warning border border-warning/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium">Valid Passes</span>
              <h3 className="text-2xl font-bold text-gray-150 mt-1">{summaryStats.validCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-info/10 rounded-lg text-blue-400 border border-blue-500/20">
              <QrCode size={24} />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium">Used Entry Scans</span>
              <h3 className="text-2xl font-bold text-gray-150 mt-1">{summaryStats.usedCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tickets Listing Table */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-800 rounded-xl bg-gray-900/10 p-8 text-center">
          <Ticket size={40} className="text-gray-600 mb-3 animate-pulse" />
          <h3 className="text-base font-bold text-gray-300">No Tickets Found</h3>
          <p className="mt-1 text-sm text-gray-400 max-w-sm">
            {hasFilters
              ? "No tickets match your current search and date filters. Try resetting filters."
              : "No admission tickets have been generated yet. Click 'Generate Tickets' to create a batch."}
          </p>
          {hasFilters && (
            <Button
              variant="secondary"
              onClick={handleClearFilters}
              className="mt-4 text-xs font-semibold"
            >
              Reset Search Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <DataTable columns={columns} data={tickets} />
          </div>

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
  );
}
