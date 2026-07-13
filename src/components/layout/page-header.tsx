import * as React from 'react';
import { Separator } from '../ui/separator';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showDivider?: boolean;
}

export function PageHeader({ title, description, actions, showDivider = false }: PageHeaderProps) {
  return (
    <div className="w-full space-y-4 mb-6 shrink-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-50">{title}</h1>
          {description && <p className="text-sm text-gray-400 leading-normal">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
      {showDivider && <Separator />}
    </div>
  );
}
