'use client';

import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Styling states
    const baseStyle =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm border border-accent-600/30',
      secondary: 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-750 active:bg-gray-700 shadow-sm',
      ghost: 'bg-transparent text-gray-400 hover:bg-gray-850 hover:text-gray-100 active:bg-gray-800',
      danger: 'bg-error/10 text-error border border-error/20 hover:bg-error/20 active:bg-error/30',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 rounded-md text-xs gap-1.5',
      md: 'h-10 px-4 rounded-md text-sm gap-2',
      lg: 'h-12 px-6 rounded-lg text-base gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-live={isLoading ? 'polite' : 'off'}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" className="text-current" />
        ) : (
          <>
            {leftIcon && <span className="flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
