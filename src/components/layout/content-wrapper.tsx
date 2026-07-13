import * as React from 'react';

export interface ContentWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ContentWrapper({ children, className = '', ...props }: ContentWrapperProps) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl flex flex-col flex-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
