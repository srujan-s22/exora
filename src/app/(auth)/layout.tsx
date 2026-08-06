import type { Metadata } from 'next';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Login',
};

/**
 * Auth layout — centered content with platform footer.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-gray-950 p-4 sm:p-6">
      <div className="flex flex-1 items-center justify-center w-full my-auto">
        {children}
      </div>
      <Footer />
    </div>
  );
}
