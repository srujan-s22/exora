import * as React from 'react';

/**
 * Footer component for Exora.
 * Displays dynamic copyright year and platform notice.
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-800/60 bg-gray-950/40 py-4 px-4 sm:px-6 mt-auto">
      <div className="mx-auto flex max-w-7xl items-center justify-center text-center">
        <p className="text-xs text-gray-500 font-medium tracking-wide">
          © {currentYear} Exora. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
