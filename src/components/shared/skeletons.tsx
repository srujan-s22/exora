import * as React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ContentWrapper } from '@/components/layout/content-wrapper';

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showSearch?: boolean;
}

/**
 * Reusable Page Header Skeleton placeholder
 */
export function PageHeaderSkeleton({ showActions = true }: { showActions?: boolean }) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 skeleton" />
          <div className="h-4 w-72 skeleton" />
        </div>
        {showActions && (
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 rounded-lg skeleton" />
            <div className="h-9 w-36 rounded-lg skeleton" />
          </div>
        )}
      </div>
      <div className="border-t border-gray-800 pt-1" />
    </div>
  );
}

/**
 * Reusable Stat Cards Row Skeleton (Default 4 columns, or customizable)
 */
export function StatCardSkeletonGrid({ columns = 4 }: { columns?: number }) {
  const colClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 3
      ? 'sm:grid-cols-3'
      : 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid gap-5 ${colClass} mb-8`}>
      {[...Array(columns)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 skeleton" />
              <div className="h-9 w-9 rounded-lg skeleton" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-32 skeleton" />
              <div className="h-3.5 w-28 skeleton" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Reusable Table Skeleton Layout (Header + N Rows)
 */
export function TableSkeleton({ rows = 6, columns = 5, showSearch = false }: TableSkeletonProps) {
  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
          <div className="h-10 w-full sm:w-72 rounded-lg skeleton" />
          <div className="h-10 w-full sm:w-48 rounded-lg skeleton" />
        </div>
      )}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden divide-y divide-gray-850">
        <div className="p-4 bg-gray-850/40 flex gap-6 items-center">
          {[...Array(columns)].map((_, i) => (
            <div key={i} className={`h-4 skeleton ${i === 0 ? 'w-24' : i === 1 ? 'flex-1' : 'w-20'}`} />
          ))}
        </div>
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="p-4 flex gap-6 items-center">
            {[...Array(columns)].map((_, c) => (
              <div key={c} className={`h-4 skeleton ${c === 0 ? 'w-20' : c === 1 ? 'flex-1' : 'w-24'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reusable Chart Frame Skeleton
 */
export function ChartSkeletonFrame({ title = 'Analytics Chart' }: { title?: string }) {
  return (
    <Card className="border border-gray-800 bg-gray-900 shadow-sm">
      <CardHeader className="py-4 border-b border-gray-800/40">
        <div className="h-4 w-40 skeleton" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 skeleton" />
          <div className="h-4 w-28 skeleton" />
        </div>
        <div className="h-44 w-full rounded-lg skeleton" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 skeleton rounded-lg" />
          <div className="h-16 skeleton rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Reusable Card Grid Skeleton (for exhibitions, rides, fraud alerts)
 */
export function CardGridSkeleton({ count = 4, columns = 2 }: { count?: number; columns?: number }) {
  const colClass = columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <div className={`grid gap-4 ${colClass}`}>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 skeleton" />
              <div className="h-3.5 w-28 skeleton" />
            </div>
            <div className="h-5 w-16 rounded-full skeleton" />
          </div>
          <div className="h-3.5 w-36 skeleton" />
          <div className="border-t border-gray-850 pt-3 flex justify-between">
            <div className="h-4 w-20 skeleton" />
            <div className="h-4 w-24 skeleton" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Reusable Form Block Skeleton
 */
export function FormSkeletonBlock({ fields = 4 }: { fields?: number }) {
  return (
    <Card className="p-6 border border-gray-800 bg-gray-900 space-y-5">
      <div className="h-5 w-40 skeleton mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(fields)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 w-24 skeleton" />
            <div className="h-10 w-full rounded-lg skeleton" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
        <div className="h-9 w-24 rounded-lg skeleton" />
        <div className="h-9 w-32 rounded-lg skeleton" />
      </div>
    </Card>
  );
}

/**
 * Reusable Activity / Scan Feed Skeleton
 */
export function FeedSkeletonList({ items = 6 }: { items?: number }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-4 border-b border-gray-850">
        <div className="h-4 w-40 skeleton" />
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {[...Array(items)].map((_, i) => (
          <div key={i} className="flex gap-3.5 items-center">
            <div className="h-8 w-8 rounded-lg skeleton shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-3.5 w-5/6 skeleton" />
              <div className="h-2.5 w-1/2 skeleton" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
