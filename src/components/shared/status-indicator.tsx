import * as React from 'react';
import type { ExhibitionStatus } from '@/lib/utils/constants';

export interface StatusIndicatorProps {
  status: ExhibitionStatus | string;
  className?: string;
}

export function StatusIndicator({ status, className = '' }: StatusIndicatorProps) {
  const norm = status.toLowerCase();

  const config: Record<
    string,
    {
      label: string;
      color: string;
      dotColor: string;
      ping: boolean;
    }
  > = {
    active: { label: 'Active', color: 'text-success bg-success/10 border-success/20', dotColor: 'bg-success', ping: true },
    draft: { label: 'Draft', color: 'text-gray-400 bg-gray-800 border-gray-700/50', dotColor: 'bg-gray-500', ping: false },
    paused: { label: 'Paused', color: 'text-warning bg-warning/10 border-warning/20', dotColor: 'bg-warning', ping: false },
    completed: { label: 'Completed', color: 'text-info bg-info/10 border-info/20', dotColor: 'bg-info', ping: false },
    upcoming: { label: 'Upcoming', color: 'text-accent-300 bg-accent-500/10 border-accent-500/20', dotColor: 'bg-accent-400', ping: false },
    closed: { label: 'Closed', color: 'text-gray-500 bg-gray-900 border-gray-850', dotColor: 'bg-gray-600', ping: false },
    archived: { label: 'Archived', color: 'text-gray-500 bg-gray-900 border-gray-850', dotColor: 'bg-gray-600', ping: false },
    true: { label: 'Active', color: 'text-success bg-success/10 border-success/20', dotColor: 'bg-success', ping: true },
    false: { label: 'Inactive', color: 'text-error bg-error/10 border-error/20', dotColor: 'bg-error', ping: false },
  };

  const current = config[norm] || { label: status, color: 'text-gray-300 bg-gray-800 border-gray-700', dotColor: 'bg-gray-400', ping: false };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.color} ${className}`}
    >
      <span className="relative flex h-2 w-2 select-none">
        {current.ping && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dotColor}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dotColor}`} />
      </span>
      <span>{current.label}</span>
    </span>
  );
}
