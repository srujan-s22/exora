import * as React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text';
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'rect', className = '', ...props }, ref) => {
    const variantClasses = {
      rect: 'rounded-md',
      circle: 'rounded-full',
      text: 'h-4 w-full rounded-sm',
    };

    return (
      <div
        ref={ref}
        className={`skeleton ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };
