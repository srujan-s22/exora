'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  // Listen for escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

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
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full rounded-xl border border-gray-700 bg-gray-900 shadow-xl overflow-hidden z-10 flex flex-col ${sizeClasses[size]}`}
          >
            {/* Header */}
            {(title || description) && (
              <div className="p-6 border-b border-gray-800/40">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 p-1.5 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg className="h-4.5 w-4.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {title && <h3 className="text-lg font-semibold tracking-tight text-gray-50 leading-none">{title}</h3>}
                {description && <p className="mt-1.5 text-sm text-gray-400">{description}</p>}
              </div>
            )}

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2.5 p-6 border-t border-gray-800/40 bg-gray-900/50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
