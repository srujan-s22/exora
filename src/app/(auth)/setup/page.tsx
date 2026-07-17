'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Lock, User, Phone, KeyRound, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';

export default function BootstrapSetupPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [isCheckingStatus, setIsCheckingStatus] = React.useState(true);
  const [isAvailable, setIsAvailable] = React.useState(false);
  const [isCreated, setIsCreated] = React.useState(false);
  const [createdUser, setCreatedUser] = React.useState<{ staffId: string; name: string } | null>(null);

  const [name, setName] = React.useState('');
  const [staffId, setStaffId] = React.useState('SUA-001');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [bootstrapSecret, setBootstrapSecret] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Check bootstrap status on mount
  React.useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/bootstrap/status', { cache: 'no-store' });
        const body = await res.json();
        if (body.success && body.data?.available) {
          setIsAvailable(true);
        } else {
          setIsAvailable(false);
        }
      } catch {
        setIsAvailable(false);
      } finally {
        setIsCheckingStatus(false);
      }
    }
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!staffId.trim()) errors.staffId = 'Staff ID is required';
    if (!phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(phoneNumber)) errors.phoneNumber = 'Must be a valid 10-digit mobile number';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(password)) errors.password = 'Must contain an uppercase letter';
    else if (!/[a-z]/.test(password)) errors.password = 'Must contain a lowercase letter';
    else if (!/[0-9]/.test(password)) errors.password = 'Must contain a number';
    if (!bootstrapSecret) errors.bootstrapSecret = 'Bootstrap secret is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/bootstrap/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), staffId: staffId.trim(), phoneNumber, password, bootstrapSecret }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create super user');
      }

      setIsCreated(true);
      setCreatedUser(body.data.user);
      addToast({ type: 'success', title: 'Super user created', message: 'You can now log in with your credentials.' });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      addToast({ type: 'error', title: 'Setup failed', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  // Bootstrap no longer available
  if (!isAvailable && !isCreated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-[420px] space-y-6">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-gray-600/50 to-transparent" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-800 text-gray-400 mx-auto mb-4 select-none">
              <Shield size={22} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-50">Setup Complete</h1>
            <p className="mt-2 text-sm text-gray-400">
              A super user has already been configured. Bootstrap setup is no longer available.
            </p>
            <Button
              className="w-full mt-6 font-semibold"
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isCreated && createdUser) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-[420px] space-y-6">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-success/60 to-transparent" />
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-success/10 text-success mx-auto mb-5 select-none border border-success/20">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-50">Super User Created</h1>
            <p className="mt-2 text-sm text-gray-400">
              Your super admin account has been set up successfully.
            </p>

            <div className="mt-5 rounded-lg bg-gray-800/50 border border-gray-700/50 p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Staff ID</span>
                <span className="font-mono font-semibold text-accent-300">{createdUser.staffId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Name</span>
                <span className="text-gray-200 font-medium">{createdUser.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Role</span>
                <span className="text-amber-400 font-medium">Super Admin</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              This setup page is now permanently locked. Use your credentials to log in.
            </p>

            <Button
              className="w-full mt-5 font-semibold"
              onClick={() => router.push('/login')}
            >
              Continue to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Setup form
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-[480px] space-y-6">
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
                EXORA — Initial Setup
              </h1>
              <p className="mt-1.5 text-xs font-medium text-gray-400">
                Create the first super admin to get started. This setup page is one-time only.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User size={14} />}
              error={fieldErrors.name}
              disabled={isLoading}
            />

            <Input
              label="Staff ID"
              placeholder="SUA-001"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              leftIcon={<Shield size={14} />}
              error={fieldErrors.staffId}
              disabled={isLoading}
              helperText="This will be your login ID. Recommended format: SUA-001"
            />

            <Input
              label="Phone Number"
              placeholder="10-digit mobile number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              leftIcon={<Phone size={14} />}
              error={fieldErrors.phoneNumber}
              disabled={isLoading}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min 8 chars, uppercase, lowercase, number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={14} />}
              error={fieldErrors.password}
              disabled={isLoading}
            />

            <Input
              label="Bootstrap Secret"
              type="password"
              placeholder="Enter the bootstrap setup secret"
              value={bootstrapSecret}
              onChange={(e) => setBootstrapSecret(e.target.value)}
              leftIcon={<KeyRound size={14} />}
              error={fieldErrors.bootstrapSecret}
              disabled={isLoading}
              helperText="This secret is configured in the server environment variables."
            />

            {error && (
              <p className="text-xs text-error font-medium text-center">{error}</p>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full font-semibold"
              size="lg"
            >
              Create Super Admin Account
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500 font-medium select-none">
          <Shield size={13} className="text-gray-600" />
          <span>One-time secure bootstrap · This page will be disabled after setup</span>
        </div>
      </div>
    </div>
  );
}
