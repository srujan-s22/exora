'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        const path = user.role === 'super_admin' ? '/admin' : `/${user.role}`;
        router.push(path);
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-950">
      <Spinner size="lg" className="text-accent-500" />
    </div>
  );
}
