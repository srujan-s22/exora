'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  placement?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  placement = 'right',
  size = 'md',
}: DrawerProps) {
  // Lock scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const sizeClasses = {
    sm: 'w-64 max-w-full',
    md: 'w-80 max-w-full',
    lg: 'w-96 max-w-full',
  };

  const placements = {
    left: {
      className: 'left-0 h-full border-r',
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
    },
    right: {
      className: 'right-0 h-full border-l',
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer content */}
          <motion.div
            initial={placements[placement].initial}
            animate={placements[placement].animate}
            exit={placements[placement].exit}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed top-0 flex flex-col bg-gray-900 border-gray-800 text-gray-200 shadow-xl overflow-hidden z-10 ${placements[placement].className} ${sizeClasses[size]}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800/40 shrink-0">
              {title ? (
                <h3 className="text-base font-semibold tracking-tight text-gray-50 leading-none">{title}</h3>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 p-1.5 transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <svg className="h-4.5 w-4.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
