'use client';

import * as React from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ToastData } from '@/types/ui.types';

export interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const { id, type, title, message } = toast;

  const icons = {
    success: <CheckCircle2 size={18} className="text-success shrink-0" />,
    warning: <AlertTriangle size={18} className="text-warning shrink-0" />,
    error: <AlertCircle size={18} className="text-error shrink-0" />,
    info: <Info size={18} className="text-info shrink-0" />,
  };

  const borderColors = {
    success: 'border-l-success',
    warning: 'border-l-warning',
    error: 'border-l-error',
    info: 'border-l-info',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`w-full max-w-sm rounded-lg border border-gray-800 bg-gray-900 border-l-4 ${borderColors[type]} p-4 shadow-lg flex gap-3 pointer-events-auto`}
    >
      <div className="pt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0 space-y-0.5 text-left">
        <h4 className="text-sm font-semibold text-gray-50">{title}</h4>
        {message && <p className="text-xs text-gray-400 leading-normal">{message}</p>}
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-gray-500 hover:text-gray-300 rounded p-0.5 hover:bg-gray-800 self-start transition-colors cursor-pointer"
        aria-label="Dismiss toast"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-full md:w-96"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}
