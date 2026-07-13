import * as React from 'react';
import type { TableColumn } from '@/types/ui.types';
import { Skeleton } from './skeleton';

export interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

export function DataTable({ columns, data, isLoading = false, emptyState }: DataTableProps<any>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-800 bg-gray-900 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-850 bg-gray-900/50">
            {columns.map((col, index) => (
              <th
                key={col.key.toString() + index}
                className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 select-none ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-850">
          {isLoading ? (
            // Shimmer Loading States
            [...Array(5)].map((_, rowIndex) => (
              <tr key={`loader-${rowIndex}`} className="hover:bg-gray-850/20">
                {columns.map((col, colIndex) => (
                  <td key={`loader-cell-${colIndex}`} className="px-6 py-4.5">
                    <Skeleton className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500">
                {emptyState || 'No records found.'}
              </td>
            </tr>
          ) : (
            // Actual Data Rows
            data.map((row, rowIndex) => (
              <tr
                key={row.id || row._id || `row-${rowIndex}`}
                className="hover:bg-gray-850 transition-colors"
              >
                {columns.map((col, colIndex) => {
                  const cellValue = col.key in row ? row[col.key] : undefined;
                  return (
                    <td
                      key={`cell-${rowIndex}-${colIndex}`}
                      className={`px-6 py-4 text-sm text-gray-250 ${col.className || ''}`}
                    >
                      {col.render ? col.render(cellValue, row) : (cellValue?.toString() ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
