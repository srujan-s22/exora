import * as React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${React.useId()}`;

    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2.5">
          <div className="flex h-5 items-center">
            <input
              id={checkboxId}
              type="checkbox"
              ref={ref}
              className={`h-4 w-4 rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20 focus:ring-offset-gray-950 focus:ring-2 cursor-pointer transition-all checked:bg-accent-500 checked:border-transparent
                ${error ? 'border-error/80' : ''}
                ${className}
              `}
              {...props}
            />
          </div>
          {label && (
            <label htmlFor={checkboxId} className="text-sm font-medium text-gray-300 cursor-pointer select-none">
              {label}
            </label>
          )}
        </div>
        {error && <p className="text-xs text-error font-medium">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
