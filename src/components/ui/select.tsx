import * as React from 'react';
import type { SelectOption } from '@/types/ui.types';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options = [], placeholder, className = '', id, children, ...props }, ref) => {
    const selectId = id || `select-${React.useId()}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-gray-300 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            className={`w-full h-10 bg-gray-800 border text-sm text-gray-150 rounded-md transition-all appearance-none focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 disabled:opacity-50 disabled:pointer-events-none pr-10 pl-3.5
              ${error ? 'border-error/80 focus:border-error focus:ring-error/20' : 'border-gray-700/80 hover:border-gray-600 focus:border-accent-500'}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500">
            <svg
              className="h-4 w-4 stroke-current fill-none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        {error ? (
          <p id={`${selectId}-error`} className="text-xs text-error font-medium">{error}</p>
        ) : helperText ? (
          <p id={`${selectId}-helper`} className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
