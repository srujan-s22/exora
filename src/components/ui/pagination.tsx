import * as React from 'react';
import { Button } from './button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({ currentPage, totalPages, onPageChange, isLoading = false }: PaginationProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages || totalPages === 0;

  return (
    <div className="flex items-center justify-between px-2.5 py-4 border-t border-gray-800 bg-transparent shrink-0">
      <div className="flex-1 flex items-center justify-between sm:hidden">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage || isLoading}
        >
          Previous
        </Button>
        <span className="text-xs font-medium text-gray-400">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage || isLoading}
        >
          Next
        </Button>
      </div>

      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-gray-400">
            Showing page <span className="font-semibold text-gray-250">{totalPages === 0 ? 0 : currentPage}</span> of{' '}
            <span className="font-semibold text-gray-250">{totalPages}</span> pages
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={isFirstPage || isLoading}
            className="px-2"
          >
            <svg className="h-4 w-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={isFirstPage || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={isLastPage || isLoading}
          >
            Next
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={isLastPage || isLoading}
            className="px-2"
          >
            <svg className="h-4 w-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
