'use client';

import type { ReactNode } from 'react';

/**
 * Theme provider.
 * Currently dark-mode only (system default via CSS).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
