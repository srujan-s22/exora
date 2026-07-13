'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

export interface TabOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabOption[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: 'underline' | 'pills';
}

export function Tabs({ tabs, activeTab, onChange, className = '', variant = 'underline' }: TabsProps) {
  return (
    <div className={`flex ${variant === 'underline' ? 'border-b border-gray-800' : ''} ${className}`}>
      <nav className={`flex gap-1.5 ${variant === 'pills' ? 'p-1 bg-gray-950 rounded-lg border border-gray-800' : ''}`} aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all select-none cursor-pointer rounded-md
                ${variant === 'underline' 
                  ? 'text-gray-400 hover:text-gray-200' 
                  : isActive 
                    ? 'text-gray-100 bg-gray-900 border border-gray-800 shadow-sm' 
                    : 'text-gray-450 hover:text-gray-200'}
              `}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>

              {variant === 'underline' && isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
