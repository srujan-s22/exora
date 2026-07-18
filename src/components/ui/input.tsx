import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', type = 'text', id, ...props }, ref) => {
    const inputId = id || `input-${React.useId()}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-300 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 flex text-gray-500 pointer-events-none select-none">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`w-full h-10 bg-gray-800 border text-sm text-gray-150 rounded-md transition-all placeholder:text-gray-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 disabled:opacity-50 disabled:pointer-events-none
              ${leftIcon ? 'pl-10' : 'pl-3.5'}
              ${rightIcon ? 'pr-10' : 'pr-3.5'}
              ${error ? 'border-error/80 focus:border-error focus:ring-error/20' : 'border-gray-700/80 hover:border-gray-600 focus:border-accent-500'}
              ${className}
            `}
            onWheel={(e) => {
              if (type === 'number') {
                e.currentTarget.blur();
              }
              if (props.onWheel) {
                props.onWheel(e);
              }
            }}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 flex text-gray-500 pointer-events-none select-none">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-error font-medium">{error}</p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
