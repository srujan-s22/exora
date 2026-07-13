'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Plus, X, Filter, Ticket, Eye, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/providers/toast-provider';
import type { Ticket as TicketType } from '@/types/ticket.types';
import type { Exhibition } from '@/types/exhibition.types';
import type { PaginationMeta, ApiSuccessResponse } from '@/types/api.types';
import type { TableColumn } from '@/types/ui.types';
import type { BadgeVariant } from '@/types/ui.types';

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

  // Fetch tickets
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

      const res = await fetch(`/api/tickets?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');

      const body: ApiSuccessResponse<{ data: TicketType[]; pagination: PaginationMeta }> = await res.json();
      if (body.success) {
        setTickets(body.data.data);
        setPagination(body.data.pagination);
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
  }, [currentPage, exhibitionId, debouncedSearch, status, ticketType, addToast]);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setTicketType('');
    setExhibitionId('');
    setCurrentPage(1);
  };

  const hasFilters = search || status || ticketType || exhibitionId;

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
      className: 'w-10',
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-50">Tickets Workspace</h1>
          <p className="mt-1 text-sm text-gray-400">
            Browse, search, and manage all generated tickets across exhibitions.
          </p>
        </div>
        <Link href="/admin/tickets/new" passHref>
          <Button className="shrink-0 flex items-center gap-1.5 font-semibold">
            <Plus size={16} />
            <span>Generate Tickets</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
          <Filter size={12} className="text-accent-400" />
          <span>Search & Filter Controls</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search by ticket #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
            className="w-full h-10"
          />

          <Select
            value={exhibitionId}
            onChange={(e) => { setExhibitionId(e.target.value); setCurrentPage(1); }}
            options={exhibitionOptions}
            className="w-full"
          />

          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
            options={statuses}
            className="w-full"
          />

          <div className="flex items-center gap-3">
            <Input
              placeholder="Filter by class..."
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value)}
              className="flex-1 h-10"
            />
            {hasFilters && (
              <Button
                variant="secondary"
                onClick={handleClearFilters}
                className="h-10 px-3 shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
              >
                <X size={14} />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <Ticket size={13} className="text-accent-500" />
          <span className="font-semibold text-gray-200">{pagination.total.toLocaleString()}</span> tickets total
        </span>
        {pagination.totalPages > 1 && (
          <span>Page {currentPage} of {pagination.totalPages}</span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-xl bg-gray-900/10 p-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-500 mb-4 select-none">
            <Ticket size={22} />
          </div>
          <h3 className="text-base font-bold text-gray-200">No Tickets Found</h3>
          <p className="mt-1 text-sm text-gray-400 max-w-sm">
            {hasFilters
              ? "No tickets match your current filters. Try adjusting your search."
              : "No tickets have been generated yet. Click 'Generate Tickets' to create a batch."}
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
          <DataTable columns={columns} data={tickets} />

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
