import * as React from 'react';
import * as Icons from 'lucide-react';
import { Button } from '../ui/button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string; // Lucide icon name
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = 'Inbox',
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const IconComponent = (Icons as any)[icon] || Icons.Inbox;

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-800 rounded-xl bg-gray-900/30 ${className}`}>
      {/* Icon frame */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-950 border border-gray-800 text-gray-500 mb-4 shadow-sm select-none">
        <IconComponent size={24} className="stroke-1.5" />
      </div>

      {/* Copy */}
      <h3 className="text-base font-bold text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6 leading-normal">{description}</p>

      {/* Optional action */}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
