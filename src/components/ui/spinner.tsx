import * as React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ size = 'md', className = '', ...props }, ref) => {
    const sizeClasses = {
      xs: 'h-3.5 w-3.5 border-2',
      sm: 'h-4 w-4 border-2',
      md: 'h-6 w-6 border-2',
      lg: 'h-8 w-8 border-3',
    };

    return (
      <span
        ref={ref}
        className={`animate-spin inline-block rounded-full border-t-transparent border-current ${sizeClasses[size]} ${className}`}
        role="status"
        aria-label="loading"
        {...props}
      />
    );
  }
);

Spinner.displayName = 'Spinner';

export { Spinner };
