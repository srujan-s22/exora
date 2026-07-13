import * as React from 'react';
import type { BadgeVariant } from '@/types/ui.types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const variantStyles: Record<BadgeVariant, string> = {
      default: 'bg-gray-800 text-gray-300 border-gray-700/50',
      success: 'bg-success/10 text-success border-success/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      error: 'bg-error/10 text-error border-error/20',
      info: 'bg-info/10 text-info border-info/20',
      accent: 'bg-accent-500/10 text-accent-300 border-accent-500/20',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
