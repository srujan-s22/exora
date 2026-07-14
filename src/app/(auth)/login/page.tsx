'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, Lock, User, UserCheck } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();
  const { addToast } = useToast();

  const [staffId, setStaffId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const redirectUrl = searchParams.get('redirect') || '/';

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      const path = user.role === 'super_admin' ? '/admin' : `/${user.role}`;
      router.push(path);
    }
  }, [user, router]);

  // If no super user exists, redirect to setup
  React.useEffect(() => {
    async function checkBootstrap() {
      try {
        const res = await fetch('/api/bootstrap/status', { cache: 'no-store' });
        const body = await res.json();
        if (body.success && body.data?.superUserExists === false) {
          router.push('/setup');
        }
      } catch {
        // Ignore
      }
    }
    checkBootstrap();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setError('Staff ID is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await login(staffId, password);
      addToast({
        type: 'success',
        title: 'Sign in successful',
        message: 'Welcome back!',
      });
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      addToast({
        type: 'error',
        title: 'Sign in failed',
        message: 'Please check your credentials.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] space-y-6">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-accent-500/80 to-transparent" />

        {/* Brand */}
        <div className="mb-8 text-center flex flex-col items-center space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500 text-white shadow-glow border border-accent-600/30 select-none">
            <Layers size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-50">
              ExhibitIQ Platform
            </h1>
            <p className="mt-1.5 text-xs font-medium text-gray-400">
              Enter credentials to access operations dashboard
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Staff ID"
            placeholder="Enter your Staff ID"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            leftIcon={<User size={16} />}
            error={error && !staffId ? 'Staff ID required' : undefined}
            disabled={isLoading}
          />
          
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            error={error && !password ? 'Password required' : undefined}
            disabled={isLoading}
          />

          {error && !error.includes('required') && (
            <p className="text-xs text-error font-medium text-center">{error}</p>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full font-semibold"
          >
            Authenticate Credentials
          </Button>
        </form>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500 font-medium select-none">
        <UserCheck size={13} className="text-gray-600" />
        <span>Secure authentication gateway · SHA256/HMAC</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-gray-950"><Spinner size="lg" className="text-accent-500" /></div>}>
      <LoginFormContent />
    </React.Suspense>
  );
}
