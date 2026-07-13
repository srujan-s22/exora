import * as React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'System Error',
  message = 'An error occurred while loading this section. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-error/20 rounded-xl bg-error/5 ${className}`}>
      {/* Icon Frame */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-950 border border-error/20 text-error mb-4 shadow-sm select-none">
        <AlertCircle size={24} className="stroke-1.5" />
      </div>

      {/* Copy */}
      <h3 className="text-base font-bold text-error mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6 leading-normal">{message}</p>

      {/* Retry Trigger */}
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} leftIcon={<RotateCcw size={13} />}>
          Retry Connection
        </Button>
      )}
    </div>
  );
}
