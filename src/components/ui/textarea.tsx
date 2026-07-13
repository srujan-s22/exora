import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const textareaId = id || `textarea-${React.useId()}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-gray-300 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          className={`w-full bg-gray-800 border text-sm text-gray-150 rounded-md transition-all placeholder:text-gray-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 disabled:opacity-50 disabled:pointer-events-none p-3.5 min-h-[80px]
            ${error ? 'border-error/80 focus:border-error focus:ring-error/20' : 'border-gray-700/80 hover:border-gray-600 focus:border-accent-500'}
            ${className}
          `}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="text-xs text-error font-medium">{error}</p>
        ) : helperText ? (
          <p id={`${textareaId}-helper`} className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
