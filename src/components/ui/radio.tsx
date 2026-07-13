import * as React from 'react';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const radioId = id || `radio-${React.useId()}`;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <input
            id={radioId}
            type="radio"
            ref={ref}
            className={`h-4 w-4 border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20 focus:ring-offset-gray-950 focus:ring-2 cursor-pointer transition-all checked:bg-accent-500 checked:border-transparent
              ${error ? 'border-error/80' : ''}
              ${className}
            `}
            {...props}
          />
          {label && (
            <label htmlFor={radioId} className="text-sm font-medium text-gray-300 cursor-pointer select-none">
              {label}
            </label>
          )}
        </div>
        {error && <p className="text-xs text-error font-medium">{error}</p>}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export { Radio };
