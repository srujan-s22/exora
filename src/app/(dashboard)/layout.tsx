'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh bg-gray-950">
      {/* Mobile nav header */}
      <MobileNav />

      {/* Desktop sidebar */}
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Sticky top bar */}
        <Topbar />

        {/* Page Content area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
