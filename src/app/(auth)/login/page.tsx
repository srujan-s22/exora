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
  const { login, verifyMfa, user } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = React.useState<'credentials' | 'mfa'>('credentials');
  const [mfaTicket, setMfaTicket] = React.useState('');
  const [staffId, setStaffId] = React.useState('');
  const [password, setPassword] = React.useState('');

  // Step 2 state
  const [totpCode, setTotpCode] = React.useState('');
  const [recoveryCode, setRecoveryCode] = React.useState('');
  const [useRecoveryMode, setUseRecoveryMode] = React.useState(false);

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

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
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
      const result = await login(staffId, password);

      if (result && result.mfaRequired && result.mfaTicket) {
        setMfaTicket(result.mfaTicket);
        setStep('mfa');
        setError('');
        return;
      }

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

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!useRecoveryMode && (!totpCode.trim() || totpCode.trim().length !== 6)) {
      setError('Please enter a valid 6-digit authentication code');
      return;
    }

    if (useRecoveryMode && !recoveryCode.trim()) {
      setError('Please enter your single-use recovery code');
      return;
    }

    setIsLoading(true);

    try {
      await verifyMfa(
        mfaTicket,
        useRecoveryMode ? undefined : totpCode.trim(),
        useRecoveryMode ? recoveryCode.trim() : undefined
      );

      addToast({
        type: 'success',
        title: 'Authentication verified',
        message: 'Welcome back!',
      });
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      addToast({
        type: 'error',
        title: 'Verification failed',
        message: err.message || 'Invalid code provided.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setMfaTicket('');
    setTotpCode('');
    setRecoveryCode('');
    setError('');
  };

  return (
    <div className="w-full max-w-[420px] space-y-6">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-accent-500/80 to-transparent" />

        {/* Brand */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="relative w-48 h-24 select-none mb-3">
            <img src="/logo2.png" alt="EXORA Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-50">
              EXORA Platform
            </h1>
            <p className="mt-1.5 text-xs font-medium text-gray-400">
              {step === 'credentials'
                ? 'Enter credentials to access operations dashboard'
                : 'Two-Factor Authentication Required'}
            </p>
          </div>
        </div>

        {/* Step 1: Credentials Form */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
        )}

        {/* Step 2: TOTP / Recovery Code Form */}
        {step === 'mfa' && (
          <form onSubmit={handleMfaSubmit} className="space-y-5">
            <div className="p-3 bg-accent-500/10 border border-accent-500/20 rounded-xl text-center">
              <div className="flex justify-center mb-1.5">
                <Lock className="text-accent-400" size={20} />
              </div>
              <p className="text-xs font-semibold text-gray-200">
                {useRecoveryMode ? 'Single-Use Recovery Code' : 'Authenticator App Code'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {useRecoveryMode
                  ? 'Enter one of your 12-character emergency recovery codes'
                  : 'Enter the 6-digit code from Google Authenticator, 2FAS, or Authy'}
              </p>
            </div>

            {!useRecoveryMode ? (
              <Input
                label="6-Digit Verification Code"
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                leftIcon={<Lock size={16} />}
                className="text-center font-mono text-lg tracking-widest"
                disabled={isLoading}
                autoFocus
              />
            ) : (
              <Input
                label="Recovery Code"
                placeholder="XXXX-XXXX-XXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                leftIcon={<Lock size={16} />}
                className="font-mono text-sm tracking-wider uppercase text-center"
                disabled={isLoading}
                autoFocus
              />
            )}

            {error && <p className="text-xs text-error font-medium text-center">{error}</p>}

            <Button type="submit" isLoading={isLoading} className="w-full font-semibold">
              {useRecoveryMode ? 'Verify Recovery Code' : 'Verify Security Code'}
            </Button>

            <div className="flex flex-col gap-2 text-center pt-1 select-none">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryMode(!useRecoveryMode);
                  setError('');
                }}
                className="text-xs text-accent-400 hover:text-accent-300 font-medium hover:underline cursor-pointer"
              >
                {useRecoveryMode ? 'Use Authenticator Code instead' : 'Lost access to authenticator? Use Recovery Code'}
              </button>

              <button
                type="button"
                onClick={handleBackToCredentials}
                className="text-xs text-gray-400 hover:text-gray-200 font-medium cursor-pointer"
              >
                ← Back to Staff ID login
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500 font-medium select-none">
        <UserCheck size={13} className="text-gray-600" />
        <span>Secure authentication gateway · SHA256/TOTP</span>
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
