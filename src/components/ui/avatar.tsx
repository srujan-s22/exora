import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackColor?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, size = 'md', fallbackColor = 'bg-accent-500/20 text-accent-300', className = '', ...props }, ref) => {
    // Generate initials (first char of name, or first 2 chars)
    const getInitials = (nameStr: string) => {
      const parts = nameStr.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return nameStr.slice(0, 2).toUpperCase();
    };

    const sizeClasses = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center justify-center rounded-full font-semibold border border-gray-700/30 select-none shrink-0 ${sizeClasses[size]} ${fallbackColor} ${className}`}
        {...props}
      >
        {getInitials(name)}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
