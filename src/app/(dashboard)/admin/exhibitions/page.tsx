'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Plus, X, Filter } from 'lucide-react';
import { ExhibitionCard } from '@/components/shared/exhibition-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { CardGridSkeleton } from '@/components/shared/skeletons';
import type { Exhibition } from '@/types/exhibition.types';
import type { PaginationMeta } from '@/types/api.types';

export default function AdminExhibitionsPage() {
  const { addToast } = useToast();
  const { hasPermission, isSuperAdmin } = useAuth();
  const [exhibitions, setExhibitions] = React.useState<Exhibition[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchExhibitions = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '9', // grid layout of 3x3 fits perfectly
        includeArchived: 'true', // Admins can manage archived ones
      });

      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (status) queryParams.append('status', status);
      if (category) queryParams.append('category', category);

      const res = await fetch(`/api/exhibitions?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch exhibitions');
      
      const body = await res.json();
      if (body.success) {
        setExhibitions(body.data.data);
        setPagination(body.data.pagination);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error loading exhibitions',
        message: err.message || 'Please check your connection.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, status, category, addToast]);

  React.useEffect(() => {
    fetchExhibitions();
  }, [fetchExhibitions]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setCurrentPage(1);
  };

  const hasFilters = search || status || category;

  const categories = [
    { label: 'General / All Categories', value: '' },
    { label: 'Art & Sculpture', value: 'art' },
    { label: 'Technology & AI', value: 'tech' },
    { label: 'Books & Literary', value: 'books' },
    { label: 'Food & Culinary', value: 'food' },
    { label: 'Trade & Commerce', value: 'trade' },
    { label: 'Cultural & Carnival', value: 'cultural' },
  ];

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
    { label: 'Completed', value: 'completed' },
    { label: 'Closed', value: 'closed' },
    { label: 'Archived', value: 'archived' },
  ];

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-50">Exhibitions Workspace</h1>
          <p className="mt-1 text-sm text-gray-400">
            Create, manage, and assign staff to exhibitions across the platform.
          </p>
        </div>
        {(isSuperAdmin || hasPermission('canCreateExhibitions')) && (
          <Link href="/admin/exhibitions/new" passHref>
            <Button className="shrink-0 flex items-center gap-1.5 font-semibold">
              <Plus size={16} />
              <span>Add Exhibition</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters panel */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
          <Filter size={12} className="text-accent-400" />
          <span>Search & Filter Controls</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search exhibitions by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
            className="w-full h-10"
          />

          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
            options={statuses}
            className="w-full"
          />

          <div className="flex items-center gap-3">
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}
              options={categories}
              className="flex-1"
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

      {/* Grid listing */}
      {isLoading ? (
        <CardGridSkeleton count={6} columns={3} />
      ) : exhibitions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-xl bg-gray-900/10 p-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-500 mb-4 select-none">
            <Search size={22} />
          </div>
          <h3 className="text-base font-bold text-gray-200">No Exhibitions Found</h3>
          <p className="mt-1 text-sm text-gray-400 max-w-sm">
            {hasFilters
              ? "We couldn't find any exhibitions matching your search queries. Try adjusting your filters."
              : "No exhibitions have been created yet. Click 'Add Exhibition' to create your first event."}
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
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exhibitions.map((exh) => (
              <ExhibitionCard
                key={exh.id}
                id={exh.id}
                name={exh.name}
                venue={exh.venue}
                startDate={exh.startDate}
                endDate={exh.endDate}
                status={exh.status}
                ticketTypes={exh.ticketTypes}
                ticketCount={exh.ticketCount}
                revenue={exh.revenue}
              />
            ))}
          </div>

          {/* Pagination */}
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
