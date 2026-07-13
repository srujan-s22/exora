import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
};

/**
 * Auth layout — centered, no sidebar chrome.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-950 p-4">
      {children}
    </div>
  );
}
