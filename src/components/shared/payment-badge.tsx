import * as React from 'react';
import { Banknote, Smartphone } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { PaymentMethod } from '@/lib/utils/constants';

export interface PaymentBadgeProps {
  method: PaymentMethod | string;
  className?: string;
}

export function PaymentBadge({ method, className = '' }: PaymentBadgeProps) {
  const isCash = method.toLowerCase() === 'cash';

  return (
    <Badge
      variant={isCash ? 'success' : 'info'}
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider py-0.5 px-2 ${className}`}
    >
      {isCash ? (
        <>
          <Banknote size={12} className="shrink-0" />
          <span>Cash</span>
        </>
      ) : (
        <>
          <Smartphone size={12} className="shrink-0" />
          <span>UPI</span>
        </>
      )}
    </Badge>
  );
}
