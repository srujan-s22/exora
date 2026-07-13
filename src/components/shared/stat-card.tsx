import * as React from 'react';
import * as Icons from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: string; // Lucide icon name
  change?: number; // e.g. 12.5 (positive) or -2.4 (negative)
  changeLabel?: string; // e.g. "vs yesterday"
  isLoading?: boolean;
}

export function StatCard({ title, value, icon, change, changeLabel = 'vs last week', isLoading = false }: StatCardProps) {
  const IconComponent = (Icons as any)[icon] || Icons.HelpCircle;

  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className="overflow-hidden hover:border-gray-600 transition-all duration-200">
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 skeleton" />
              <div className="h-8 w-8 rounded-lg skeleton" />
            </div>
            <div className="h-8 w-32 skeleton" />
            <div className="h-4 w-28 skeleton" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider select-none">
                {title}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 border border-gray-700/60 text-gray-400">
                <IconComponent size={18} />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight text-gray-50">{value}</h2>
              {change !== undefined && (
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold
                      ${isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}
                    `}
                  >
                    {isPositive ? '+' : ''}
                    {change}%
                  </span>
                  <span className="text-gray-500">{changeLabel}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
