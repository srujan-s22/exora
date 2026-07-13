import * as React from 'react';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = 'horizontal', className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-gray-800 shrink-0 ${
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
        } ${className}`}
        role="separator"
        {...props}
      />
    );
  }
);
Separator.displayName = 'Separator';

export { Separator };
