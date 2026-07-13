'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, onSelect, align = 'right', className = '' }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-lg focus:outline-none p-1.5
              ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}
            `}
          >
            <div className="py-0.5 space-y-0.5" role="none">
              {items.map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    if (!item.disabled) {
                      onSelect(item.value);
                      setOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors text-left disabled:opacity-40 disabled:pointer-events-none cursor-pointer
                    ${item.danger 
                      ? 'text-error hover:bg-error/10' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'}
                  `}
                  role="menuitem"
                >
                  {item.icon && <span className="flex-shrink-0 text-current">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
