'use client';

import * as React from 'react';
import {
  User, Settings, Monitor, Lock, Mail, Heading,
  Volume2, VolumeX, RefreshCw, Save, ShieldAlert,
  HelpCircle, UserCheck, Key, Shield, Info, Printer, Eye, Sliders,
  QrCode, ShieldCheck, ShieldX, Copy, Check, AlertTriangle, Download, X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { FormSkeletonBlock } from '@/components/shared/skeletons';
import { QRDisplay } from '@/components/shared/qr-display';
import type { IPrintConfig } from '@/lib/db/models/system-settings.model';

type ActiveTab = 'profile' | 'system' | 'client';

export default function SettingsPage() {
  const { addToast } = useToast();
  const { user: authUser } = useAuth();

  const [activeTab, setActiveTab] = React.useState<ActiveTab>('profile');
  const [isLoading, setIsLoading] = React.useState(true);

  // Profile Form State
  const [profileForm, setProfileForm] = React.useState({
    name: '',
    email: '',
    staffId: '',
    role: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [profileErrors, setProfileErrors] = React.useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // MFA State (Super Admin)
  const [mfaStatus, setMfaStatus] = React.useState<{ enabled: boolean; totpEnabledAt?: string; lastTotpLoginAt?: string } | null>(null);
  
  // Setup Modal State
  const [isSetupModalOpen, setIsSetupModalOpen] = React.useState(false);
  const [isStartingSetup, setIsStartingSetup] = React.useState(false);
  const [setupData, setSetupData] = React.useState<{ setupToken: string; secret: string; qrCodeUrl: string; recoveryCodes: string[] } | null>(null);
  const [setupCode, setSetupCode] = React.useState('');
  const [isEnablingMfa, setIsEnablingMfa] = React.useState(false);
  const [setupError, setSetupError] = React.useState('');
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const [copiedCodes, setCopiedCodes] = React.useState(false);

  // Disable Modal State
  const [isDisableModalOpen, setIsDisableModalOpen] = React.useState(false);
  const [disablePassword, setDisablePassword] = React.useState('');
  const [disableCode, setDisableCode] = React.useState('');
  const [disableRecoveryCode, setDisableRecoveryCode] = React.useState('');
  const [useDisableRecovery, setUseDisableRecovery] = React.useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = React.useState(false);
  const [disableError, setDisableError] = React.useState('');

  // Regenerate Recovery Codes Modal State
  const [isRegenModalOpen, setIsRegenModalOpen] = React.useState(false);
  const [regenPassword, setRegenPassword] = React.useState('');
  const [regenCode, setRegenCode] = React.useState('');
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [newRecoveryCodes, setNewRecoveryCodes] = React.useState<string[] | null>(null);
  const [regenError, setRegenError] = React.useState('');
  const [copiedRegenCodes, setCopiedRegenCodes] = React.useState(false);

  // System Settings Form State
  const [systemForm, setSystemForm] = React.useState({
    siteTitle: 'EXORA',
    supportEmail: 'platform.exora@gmail.com',
    defaultTicketValidity: 24,
    ticketPrefix: 'EXH',
    maxScansPerTicket: 1,
    cancellationWindowSeconds: 30,
    lastUpdatedBy: '',
    lastUpdatedAt: '',
  });
  const [systemErrors, setSystemErrors] = React.useState<Record<string, string>>({});
  const [isSavingSystem, setIsSavingSystem] = React.useState(false);

  // Ticket Print Configuration State
  const [printForm, setPrintForm] = React.useState<IPrintConfig>({
    paperType: 'thermal_80mm',
    layoutMode: 'thermal',
    paperWidth: 80,
    paperHeight: 0,
    unit: 'mm',
    orientation: 'portrait',
    marginTop: 2,
    marginRight: 2,
    marginBottom: 2,
    marginLeft: 2,
    ticketPadding: 4,
    qrSize: 48,
    fontScale: 1.0,
    showLogo: true,
    showFooter: true,
    compactMode: true,
  });

  // Apply paper preset defaults
  const handleApplyPreset = (preset: 'thermal_80mm' | 'thermal_58mm' | 'a4' | 'custom') => {
    if (preset === 'thermal_80mm') {
      setPrintForm((p) => ({
        ...p,
        paperType: 'thermal_80mm',
        layoutMode: 'thermal',
        paperWidth: 80,
        paperHeight: 0,
        unit: 'mm',
        marginTop: 2,
        marginRight: 2,
        marginBottom: 2,
        marginLeft: 2,
        ticketPadding: 4,
        qrSize: 48,
        fontScale: 1.0,
        compactMode: true,
      }));
    } else if (preset === 'thermal_58mm') {
      setPrintForm((p) => ({
        ...p,
        paperType: 'thermal_58mm',
        layoutMode: 'thermal',
        paperWidth: 58,
        paperHeight: 0,
        unit: 'mm',
        marginTop: 1,
        marginRight: 1,
        marginBottom: 1,
        marginLeft: 1,
        ticketPadding: 2,
        qrSize: 36,
        fontScale: 0.85,
        compactMode: true,
      }));
    } else if (preset === 'a4') {
      setPrintForm((p) => ({
        ...p,
        paperType: 'a4',
        layoutMode: 'a4',
        paperWidth: 210,
        paperHeight: 297,
        unit: 'mm',
        marginTop: 10,
        marginRight: 10,
        marginBottom: 10,
        marginLeft: 10,
        ticketPadding: 8,
        qrSize: 64,
        fontScale: 1.1,
        compactMode: false,
      }));
    } else {
      setPrintForm((p) => ({
        ...p,
        paperType: 'custom',
        layoutMode: 'custom',
      }));
    }
  };

  // Client/Local Settings State
  const [clientForm, setClientForm] = React.useState({
    autoRefreshInterval: 'off',
    playScanSounds: true,
  });

  // Fetch initial profile and system settings data
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Profile Info
      const profileRes = await fetch('/api/profile');
      if (profileRes.ok) {
        const profileBody = await profileRes.json();
        if (profileBody.success) {
          const u = profileBody.data;
          setProfileForm((p) => ({
            ...p,
            name: u.name,
            email: u.email || '',
            staffId: u.staffId,
            role: u.role,
          }));
        }
      }

      // 2. Fetch System Settings & MFA Status (only for Super Admins)
      if (authUser?.role === 'super_admin') {
        const [settingsRes, mfaRes] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch('/api/auth/mfa/status'),
        ]);

        if (settingsRes.ok) {
          const settingsBody = await settingsRes.json();
          if (settingsBody.success) {
            const s = settingsBody.data;
            setSystemForm({
              siteTitle: s.siteTitle,
              supportEmail: s.supportEmail,
              defaultTicketValidity: s.defaultTicketValidity,
              ticketPrefix: s.ticketPrefix,
              maxScansPerTicket: s.maxScansPerTicket,
              cancellationWindowSeconds: s.cancellationWindowSeconds || 30,
              lastUpdatedBy: s.updatedBy?.name ? `${s.updatedBy.name} (${s.updatedBy.staffId})` : 'System',
              lastUpdatedAt: new Date(s.updatedAt).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              }),
            });
            if (s.printConfig) {
              setPrintForm(s.printConfig);
            }
          }
        }

        if (mfaRes.ok) {
          const mfaBody = await mfaRes.json();
          if (mfaBody.success) {
            setMfaStatus(mfaBody.data);
          }
        }
      }

      // 3. Load Local Settings
      const savedInterval = localStorage.getItem('exhiq_auto_refresh') || 'off';
      const savedSounds = localStorage.getItem('exhiq_scan_sounds') !== 'false';
      setClientForm({
        autoRefreshInterval: savedInterval,
        playScanSounds: savedSounds,
      });

    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error loading settings',
        message: err.message || 'Please verify your internet connection.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.role, addToast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Profile Form Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!profileForm.name.trim()) errors.name = 'Name is required';
    if (profileForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      errors.email = 'Invalid email address';
    }
    if (profileForm.newPassword || profileForm.currentPassword) {
      if (!profileForm.currentPassword) {
        errors.currentPassword = 'Current password is required';
      }
      if (!profileForm.newPassword) {
        errors.newPassword = 'New password is required';
      }
    }
    if (profileForm.newPassword) {
      if (profileForm.newPassword.length < 8) {
        errors.newPassword = 'Password must be at least 8 characters';
      } else if (!/[A-Z]/.test(profileForm.newPassword)) {
        errors.newPassword = 'Must contain an uppercase letter';
      } else if (!/[a-z]/.test(profileForm.newPassword)) {
        errors.newPassword = 'Must contain a lowercase letter';
      } else if (!/[0-9]/.test(profileForm.newPassword)) {
        errors.newPassword = 'Must contain a number';
      }

      if (profileForm.newPassword !== profileForm.confirmNewPassword) {
        errors.confirmNewPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setIsSavingProfile(true);
    setProfileErrors({});

    try {
      const payload: Record<string, string> = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim() || '',
      };
      if (profileForm.newPassword) {
        payload.password = profileForm.newPassword;
        payload.currentPassword = profileForm.currentPassword;
      }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        if (body.error?.code === 'INVALID_PASSWORD') {
          setProfileErrors({ currentPassword: body.error.message || 'Current password is incorrect' });
          return;
        }
        throw new Error(body.error?.message || 'Failed to update profile');
      }

      addToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your profile changes have been saved successfully.',
      });

      setProfileForm((p) => ({
        ...p,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update failed', message: err.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle System Form Submit
  const handleSaveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!systemForm.siteTitle.trim()) errors.siteTitle = 'Site title is required';
    if (!systemForm.supportEmail.trim()) {
      errors.supportEmail = 'Support email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(systemForm.supportEmail)) {
      errors.supportEmail = 'Invalid email address';
    }
    if (systemForm.defaultTicketValidity < 1) errors.defaultTicketValidity = 'Must be at least 1 hour';
    if (!systemForm.ticketPrefix.trim()) {
      errors.ticketPrefix = 'Ticket prefix is required';
    } else if (systemForm.ticketPrefix.length > 10) {
      errors.ticketPrefix = 'Prefix must be under 10 characters';
    }
    if (systemForm.maxScansPerTicket < 1) errors.maxScansPerTicket = 'Must be at least 1 scan';
    if (systemForm.cancellationWindowSeconds < 5) errors.cancellationWindowSeconds = 'Must be at least 5 seconds';

    if (Object.keys(errors).length > 0) {
      setSystemErrors(errors);
      return;
    }

    setIsSavingSystem(true);
    setSystemErrors({});

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...systemForm,
          printConfig: printForm,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update system settings');
      }

      addToast({
        type: 'success',
        title: 'System settings saved',
        message: 'System configuration parameters updated successfully.',
      });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update failed', message: err.message });
    } finally {
      setIsSavingSystem(false);
    }
  };

  // Save Local/Client Settings
  const handleSaveClientSettings = () => {
    try {
      localStorage.setItem('exhiq_auto_refresh', clientForm.autoRefreshInterval);
      localStorage.setItem('exhiq_scan_sounds', String(clientForm.playScanSounds));

      addToast({
        type: 'success',
        title: 'Preferences saved',
        message: 'Local browser preferences stored successfully.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to save',
        message: 'Could not store preferences in browser storage.',
      });
    }
  };

  // Handle Start MFA Setup
  const handleStartMfaSetup = async () => {
    setIsStartingSetup(true);
    setSetupError('');
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to initiate MFA setup');
      }

      setSetupData(body.data);
      setSetupCode('');
      setIsSetupModalOpen(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Setup failed', message: err.message });
    } finally {
      setIsStartingSetup(false);
    }
  };

  // Handle Confirm Enable MFA
  const handleConfirmEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    if (!setupCode || setupCode.length !== 6) {
      setSetupError('Please enter the 6-digit verification code from your authenticator app');
      return;
    }

    setIsEnablingMfa(true);
    setSetupError('');

    try {
      const res = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupToken: setupData.setupToken,
          code: setupCode.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setSetupError(body.error?.message || 'Invalid verification code');
        return;
      }

      addToast({
        type: 'success',
        title: 'MFA Enabled',
        message: 'Two-factor authentication has been enabled on your account.',
      });

      setIsSetupModalOpen(false);
      setSetupData(null);
      setSetupCode('');
      loadData();
    } catch (err: any) {
      setSetupError(err.message || 'Failed to enable MFA');
    } finally {
      setIsEnablingMfa(false);
    }
  };

  // Handle Confirm Disable MFA
  const handleConfirmDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      setDisableError('Current password is required');
      return;
    }

    if (!useDisableRecovery && !disableCode) {
      setDisableError('Verification code is required');
      return;
    }

    if (useDisableRecovery && !disableRecoveryCode) {
      setDisableError('Recovery code is required');
      return;
    }

    setIsDisablingMfa(true);
    setDisableError('');

    try {
      const res = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: disablePassword,
          code: useDisableRecovery ? undefined : disableCode.trim(),
          recoveryCode: useDisableRecovery ? disableRecoveryCode.trim() : undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setDisableError(body.error?.message || 'Failed to disable MFA');
        return;
      }

      addToast({
        type: 'success',
        title: 'MFA Disabled',
        message: 'Two-factor authentication has been disabled.',
      });

      setIsDisableModalOpen(false);
      setDisablePassword('');
      setDisableCode('');
      setDisableRecoveryCode('');
      loadData();
    } catch (err: any) {
      setDisableError(err.message || 'Failed to disable MFA');
    } finally {
      setIsDisablingMfa(false);
    }
  };

  // Handle Confirm Regenerate Recovery Codes
  const handleConfirmRegenCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regenPassword) {
      setRegenError('Current password is required');
      return;
    }
    if (!regenCode || regenCode.length !== 6) {
      setRegenError('6-digit TOTP code is required');
      return;
    }

    setIsRegenerating(true);
    setRegenError('');

    try {
      const res = await fetch('/api/auth/mfa/regenerate-recovery-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: regenPassword,
          code: regenCode.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setRegenError(body.error?.message || 'Failed to regenerate recovery codes');
        return;
      }

      setNewRecoveryCodes(body.data.recoveryCodes);
      addToast({
        type: 'success',
        title: 'Recovery Codes Regenerated',
        message: 'Your previous recovery codes have been invalidated.',
      });
    } catch (err: any) {
      setRegenError(err.message || 'Failed to regenerate recovery codes');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <ContentWrapper>
        <PageHeader title="Settings & Setup" description="Configure your personal profile details, set local client behaviors, and manage system branding rules." showDivider />
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-64 shrink-0 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-11 w-full rounded-lg skeleton" />
            ))}
          </div>
          <div className="flex-1 w-full">
            <FormSkeletonBlock fields={4} />
          </div>
        </div>
      </ContentWrapper>
    );
  }

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: <User size={15} /> },
    ...(authUser?.role === 'super_admin' ? [{ id: 'system', label: 'System Configuration', icon: <Settings size={15} /> }] : []),
    { id: 'client', label: 'Preferences', icon: <Monitor size={15} /> },
  ] as const;

  return (
    <ContentWrapper>
      {/* Header */}
      <PageHeader
        title="Settings & Setup"
        description="Configure your personal profile details, set local client behaviors, and manage system branding rules."
        showDivider
      />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Tab List Navigation */}
        <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1 p-1 bg-gray-900/60 border border-gray-800 rounded-xl overflow-x-auto select-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all text-left w-full cursor-pointer
                ${activeTab === tab.id
                  ? 'bg-accent-500/10 text-accent-300 border-l-2 border-accent-500 pl-3.5'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 w-full space-y-6">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <>
              <Card className="border border-gray-800 bg-gray-900/50 shadow-xl">
              <CardHeader className="border-b border-gray-850 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User size={18} className="text-accent-400" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>
                  Update your display name, contact email, or update your password.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveProfile}>
                <CardContent className="space-y-4 pt-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Staff ID"
                      value={profileForm.staffId}
                      disabled
                      leftIcon={<Key size={14} />}
                      className="opacity-60 bg-gray-850/50 font-mono text-xs uppercase"
                      helperText="Your identifier, managed by administrators."
                    />
                    <Input
                      label="Assigned Role"
                      value={profileForm.role.toUpperCase()}
                      disabled
                      leftIcon={<Shield size={14} />}
                      className="opacity-60 bg-gray-850/50 font-semibold"
                      helperText="Operational role defining access rules."
                    />
                  </div>

                  <Input
                    label="Display Name"
                    placeholder="Enter your name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    error={profileErrors.name}
                    leftIcon={<User size={14} />}
                  />

                  <Input
                    label="Email Address"
                    placeholder="you@example.com"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                    error={profileErrors.email}
                    leftIcon={<Mail size={14} />}
                  />

                  <div className="border-t border-gray-850/60 pt-5 space-y-4">
                    <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                      <Lock size={15} className="text-accent-400" />
                      <span>Change Password</span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      Leave these fields empty if you do not want to change your current password.
                    </p>

                    <Input
                      label="Current Password"
                      placeholder="••••••••"
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      error={profileErrors.currentPassword}
                      leftIcon={<Lock size={14} />}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="New Password"
                        placeholder="••••••••"
                        type="password"
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm((p) => ({ ...p, newPassword: e.target.value }))}
                        error={profileErrors.newPassword}
                        leftIcon={<Lock size={14} />}
                      />
                      <Input
                        label="Confirm New Password"
                        placeholder="••••••••"
                        type="password"
                        value={profileForm.confirmNewPassword}
                        onChange={(e) => setProfileForm((p) => ({ ...p, confirmNewPassword: e.target.value }))}
                        error={profileErrors.confirmNewPassword}
                        leftIcon={<UserCheck size={14} />}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-gray-850/60 flex justify-end gap-3 pt-4">
                  <Button
                    type="submit"
                    isLoading={isSavingProfile}
                    leftIcon={<Save size={14} />}
                  >
                    Save Profile Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* TWO-FACTOR AUTHENTICATION CARD (Super Admin Only) */}
            {authUser?.role === 'super_admin' && (
              <Card className="border border-gray-800 bg-gray-900/50 shadow-xl mt-6">
                <CardHeader className="border-b border-gray-850 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck size={18} className="text-accent-400" />
                      <span>Two-Factor Authentication (TOTP MFA)</span>
                    </CardTitle>
                    {mfaStatus?.enabled ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 select-none">
                        <ShieldCheck size={13} />
                        <span>MFA Protected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 select-none">
                        <ShieldX size={13} />
                        <span>Disabled</span>
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    Protect your Super Admin account using Google Authenticator, Authy, Microsoft Authenticator, or 2FAS.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {mfaStatus?.enabled ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
                        <p className="text-xs font-semibold text-gray-200">
                          Two-factor authentication is active on your account.
                        </p>
                        <p className="text-xs text-gray-400">
                          Every sign-in attempt will require your password and a 6-digit TOTP verification code from your authenticator app.
                        </p>
                        {mfaStatus.totpEnabledAt && (
                          <p className="text-[11px] font-mono text-gray-500 pt-1">
                            Enabled on: {new Date(mfaStatus.totpEnabledAt).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setIsRegenModalOpen(true);
                            setRegenError('');
                            setRegenPassword('');
                            setRegenCode('');
                            setNewRecoveryCodes(null);
                          }}
                          leftIcon={<RefreshCw size={14} />}
                        >
                          Regenerate Recovery Codes
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setIsDisableModalOpen(true);
                            setDisableError('');
                            setDisablePassword('');
                            setDisableCode('');
                            setDisableRecoveryCode('');
                          }}
                          leftIcon={<ShieldX size={14} />}
                        >
                          Disable Two-Factor Authentication
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-2">
                        <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle size={14} />
                          <span>Enhanced Security Recommended</span>
                        </p>
                        <p className="text-xs text-gray-300">
                          As a Super Admin, enabling Two-Factor Authentication prevents unauthorized access even if your password is compromised.
                        </p>
                      </div>

                      <div>
                        <Button
                          type="button"
                          onClick={handleStartMfaSetup}
                          isLoading={isStartingSetup}
                          leftIcon={<QrCode size={15} />}
                        >
                          Enable Two-Factor Authentication
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

          {/* SYSTEM TAB (Super Admin only) */}
          {activeTab === 'system' && authUser?.role === 'super_admin' && (
            <Card className="border border-gray-800 bg-gray-900/50 shadow-xl">
              <CardHeader className="border-b border-gray-850 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings size={18} className="text-accent-400" />
                  <span>System Configuration</span>
                </CardTitle>
                <CardDescription>
                  Configure app-wide rules, ticket validation parameters, and support info.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveSystem}>
                <CardContent className="space-y-5 pt-5">
                  {/* Branding */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                      <Heading size={12} className="text-accent-400" />
                      <span>App Branding</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Application Name"
                        value={systemForm.siteTitle}
                        onChange={(e) => setSystemForm((p) => ({ ...p, siteTitle: e.target.value }))}
                        error={systemErrors.siteTitle}
                        leftIcon={<Heading size={14} />}
                      />
                      <Input
                        label="Support Email Address"
                        value={systemForm.supportEmail}
                        onChange={(e) => setSystemForm((p) => ({ ...p, supportEmail: e.target.value }))}
                        error={systemErrors.supportEmail}
                        leftIcon={<Mail size={14} />}
                      />
                    </div>
                  </div>

                  {/* Ticketing Policy */}
                  <div className="border-t border-gray-850/60 pt-5 space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                      <Lock size={12} className="text-accent-400" />
                      <span>Ticketing Policies</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <Input
                        label="Ticket ID Prefix"
                        value={systemForm.ticketPrefix}
                        onChange={(e) => setSystemForm((p) => ({ ...p, ticketPrefix: e.target.value.toUpperCase() }))}
                        error={systemErrors.ticketPrefix}
                        leftIcon={<Key size={14} />}
                        helperText="Prefix for tickets (e.g. EXH)"
                      />
                      <Input
                        label="Default Expiry (Hours)"
                        type="number"
                        value={systemForm.defaultTicketValidity}
                        onChange={(e) => setSystemForm((p) => ({ ...p, defaultTicketValidity: Math.max(1, parseInt(e.target.value) || 0) }))}
                        error={systemErrors.defaultTicketValidity}
                        leftIcon={<RefreshCw size={14} />}
                        helperText="Standard lifespan of tickets"
                      />
                      <Input
                        label="Max Scans Per Ticket"
                        type="number"
                        value={systemForm.maxScansPerTicket}
                        onChange={(e) => setSystemForm((p) => ({ ...p, maxScansPerTicket: Math.max(1, parseInt(e.target.value) || 0) }))}
                        error={systemErrors.maxScansPerTicket}
                        leftIcon={<Info size={14} />}
                        helperText="Number of gate entries allowed"
                      />
                      <Input
                        label="Cancellation Window (Sec)"
                        type="number"
                        value={systemForm.cancellationWindowSeconds}
                        onChange={(e) => setSystemForm((p) => ({ ...p, cancellationWindowSeconds: Math.max(5, parseInt(e.target.value) || 0) }))}
                        error={systemErrors.cancellationWindowSeconds}
                        leftIcon={<RefreshCw size={14} />}
                        helperText="Time frame to void a transaction"
                      />
                    </div>
                  </div>

                  {/* Ticket Printing Layout Configuration & Live Preview */}
                  <div className="border-t border-gray-850/60 pt-5 space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                        <Printer size={13} className="text-accent-400" />
                        <span>Ticket Print Layout & Thermal Paper Settings</span>
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApplyPreset('thermal_80mm')}
                          className={`text-xs h-7 px-2.5 ${printForm.paperType === 'thermal_80mm' ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          Thermal 80mm
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApplyPreset('thermal_58mm')}
                          className={`text-xs h-7 px-2.5 ${printForm.paperType === 'thermal_58mm' ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          Thermal 58mm
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApplyPreset('a4')}
                          className={`text-xs h-7 px-2.5 ${printForm.paperType === 'a4' ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          A4 Standard
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApplyPreset('custom')}
                          className={`text-xs h-7 px-2.5 ${printForm.paperType === 'custom' ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          Custom
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left: Printing Parameter Inputs */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            label="Paper Width"
                            type="number"
                            value={printForm.paperWidth}
                            onChange={(e) => setPrintForm((p) => ({ ...p, paperWidth: Math.max(20, parseInt(e.target.value) || 0) }))}
                            helperText="Width (e.g. 80mm)"
                          />
                          <Input
                            label="Paper Height"
                            type="number"
                            value={printForm.paperHeight}
                            onChange={(e) => setPrintForm((p) => ({ ...p, paperHeight: Math.max(0, parseInt(e.target.value) || 0) }))}
                            helperText="0 = Continuous roll"
                          />
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-300">Dimension Unit</label>
                            <Select
                              value={printForm.unit}
                              onChange={(e) => setPrintForm((p) => ({ ...p, unit: e.target.value as any }))}
                              options={[
                                { label: 'Millimeters (mm)', value: 'mm' },
                                { label: 'Pixels (px)', value: 'px' },
                                { label: 'Centimeters (cm)', value: 'cm' },
                              ]}
                            />
                          </div>
                        </div>

                        {/* Margins */}
                        <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800 space-y-3">
                          <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Page Margins ({printForm.unit})</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Input
                              label="Top"
                              type="number"
                              value={printForm.marginTop}
                              onChange={(e) => setPrintForm((p) => ({ ...p, marginTop: Math.max(0, parseInt(e.target.value) || 0) }))}
                            />
                            <Input
                              label="Right"
                              type="number"
                              value={printForm.marginRight}
                              onChange={(e) => setPrintForm((p) => ({ ...p, marginRight: Math.max(0, parseInt(e.target.value) || 0) }))}
                            />
                            <Input
                              label="Bottom"
                              type="number"
                              value={printForm.marginBottom}
                              onChange={(e) => setPrintForm((p) => ({ ...p, marginBottom: Math.max(0, parseInt(e.target.value) || 0) }))}
                            />
                            <Input
                              label="Left"
                              type="number"
                              value={printForm.marginLeft}
                              onChange={(e) => setPrintForm((p) => ({ ...p, marginLeft: Math.max(0, parseInt(e.target.value) || 0) }))}
                            />
                          </div>
                        </div>

                        {/* Layout & QR Styling */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            label="QR Code Size"
                            type="number"
                            value={printForm.qrSize}
                            onChange={(e) => setPrintForm((p) => ({ ...p, qrSize: Math.max(20, parseInt(e.target.value) || 0) }))}
                            helperText="QR image width/height"
                          />
                          <Input
                            label="Ticket Padding"
                            type="number"
                            value={printForm.ticketPadding}
                            onChange={(e) => setPrintForm((p) => ({ ...p, ticketPadding: Math.max(0, parseInt(e.target.value) || 0) }))}
                            helperText="Inner margin"
                          />
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-300">Font Scale ({printForm.fontScale}x)</label>
                            <input
                              type="range"
                              min="0.75"
                              max="1.5"
                              step="0.05"
                              value={printForm.fontScale}
                              onChange={(e) => setPrintForm((p) => ({ ...p, fontScale: parseFloat(e.target.value) }))}
                              className="w-full h-8 accent-accent-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-wrap gap-4 pt-1">
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={printForm.showLogo}
                              onChange={(e) => setPrintForm((p) => ({ ...p, showLogo: e.target.checked }))}
                              className="rounded border-gray-700 bg-gray-900 text-accent-500 focus:ring-accent-500 h-4 w-4"
                            />
                            <span>Show Header Logo</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={printForm.showFooter}
                              onChange={(e) => setPrintForm((p) => ({ ...p, showFooter: e.target.checked }))}
                              className="rounded border-gray-700 bg-gray-900 text-accent-500 focus:ring-accent-500 h-4 w-4"
                            />
                            <span>Show Footer Note</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={printForm.compactMode}
                              onChange={(e) => setPrintForm((p) => ({ ...p, compactMode: e.target.checked }))}
                              className="rounded border-gray-700 bg-gray-900 text-accent-500 focus:ring-accent-500 h-4 w-4"
                            />
                            <span>Compact Thermal Layout</span>
                          </label>
                        </div>
                      </div>

                      {/* Right: Live Ticket Print Preview */}
                      <div className="lg:col-span-5 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                            <Eye size={14} className="text-accent-400" />
                            <span>Live Print Preview</span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {printForm.paperWidth}{printForm.unit} × {printForm.paperHeight > 0 ? `${printForm.paperHeight}${printForm.unit}` : 'AUTO ROLL'}
                          </span>
                        </div>

                        <div className="w-full p-4 bg-gray-950/80 rounded-xl border border-gray-800 flex items-center justify-center min-h-[340px] overflow-hidden">
                          <QRDisplay
                            ticketNumber="EXH-9981-LIVE-PREVIEW"
                            qrPayload="EXORA-LIVE-TICKET-PRINT-PREVIEW-TOKEN"
                            ticketType="general"
                            price={50000}
                            exhibitionName="LIVE PRINT PREVIEW"
                            quantity={4}
                            remainingCount={4}
                            printConfig={printForm}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Meta */}
                  {systemForm.lastUpdatedAt && (
                    <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg text-xs text-gray-400 border border-gray-850">
                      <ShieldAlert size={14} className="text-accent-400 shrink-0" />
                      <span>
                        Last updated by <span className="text-gray-300 font-semibold">{systemForm.lastUpdatedBy}</span> on {systemForm.lastUpdatedAt}
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t border-gray-850/60 flex justify-end gap-3 pt-4">
                  <Button
                    type="submit"
                    isLoading={isSavingSystem}
                    leftIcon={<Save size={14} />}
                  >
                    Update System Configuration
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* CLIENT TAB */}
          {activeTab === 'client' && (
            <Card className="border border-gray-800 bg-gray-900/50 shadow-xl">
              <CardHeader className="border-b border-gray-850 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor size={18} className="text-accent-400" />
                  <span>Preferences</span>
                </CardTitle>
                <CardDescription>
                  Configure browser preferences and interface settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Auto refresh */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest">
                      Dashboard Auto-Refresh
                    </label>
                    <Select
                      value={clientForm.autoRefreshInterval}
                      onChange={(e) => setClientForm((p) => ({ ...p, autoRefreshInterval: e.target.value }))}
                      options={[
                        { label: 'Disabled (Manual Refresh)', value: 'off' },
                        { label: 'Every 30 Seconds', value: '30000' },
                        { label: 'Every 1 Minute', value: '60000' },
                        { label: 'Every 5 Minutes', value: '300000' },
                      ]}
                    />
                    <p className="text-xs text-gray-500">
                      Rate at which monitoring and fraud panels pull new reports.
                    </p>
                  </div>

                  {/* Play audio sounds */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest">
                      Scan Audio Alerts
                    </label>
                    <button
                      onClick={() => setClientForm((p) => ({ ...p, playScanSounds: !p.playScanSounds }))}
                      className={`flex items-center justify-between w-full h-10 px-3.5 bg-gray-850 hover:bg-gray-800 border border-gray-700/60 rounded-md transition-colors text-left text-sm cursor-pointer
                        ${clientForm.playScanSounds ? 'text-accent-300 border-accent-500/20' : 'text-gray-400'}`}
                    >
                      <span>{clientForm.playScanSounds ? 'Sounds Enabled' : 'Muted'}</span>
                      {clientForm.playScanSounds ? (
                        <Volume2 size={16} className="text-accent-400" />
                      ) : (
                        <VolumeX size={16} className="text-gray-500" />
                      )}
                    </button>
                    <p className="text-xs text-gray-500">
                      Play audible tones for successful or failed scan alerts.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-850/60 flex justify-end gap-3 pt-4">
                <Button
                  onClick={handleSaveClientSettings}
                  leftIcon={<Save size={14} />}
                >
                  Save Local Preferences
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* ── MFA SETUP MODAL ── */}
      {isSetupModalOpen && setupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl my-8 relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2.5">
                <QrCode className="text-accent-400" size={20} />
                <h2 className="text-lg font-bold text-gray-50">Enable Two-Factor Authentication</h2>
              </div>
              <button
                onClick={() => {
                  setIsSetupModalOpen(false);
                  setSetupData(null);
                }}
                className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmEnableMfa} className="space-y-6">
              {/* Step 1: QR & Key */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Step 1: Scan QR Code or enter setup key
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-gray-950/80 rounded-xl border border-gray-800">
                  <div className="shrink-0 p-2 bg-white rounded-xl shadow-md">
                    <img src={setupData.qrCodeUrl} alt="MFA QR Code" className="w-36 h-36" />
                  </div>
                  <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
                    <p className="text-xs text-gray-400">
                      Scan this QR code using Google Authenticator, 2FAS, Authy, or Microsoft Authenticator.
                    </p>
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 block uppercase">Manual Setup Key</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="px-2.5 py-1 bg-gray-900 border border-gray-700/60 rounded text-xs font-mono font-bold text-accent-300 break-all select-all">
                          {setupData.secret}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(setupData.secret);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                          }}
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors cursor-pointer shrink-0"
                          title="Copy setup key"
                        >
                          {copiedSecret ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Recovery Codes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Step 2: Save Emergency Recovery Codes
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'));
                      setCopiedCodes(true);
                      setTimeout(() => setCopiedCodes(false), 2000);
                    }}
                    className="text-xs text-accent-400 hover:text-accent-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCodes ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCodes ? 'Copied Codes' : 'Copy All Codes'}</span>
                  </button>
                </div>
                <div className="p-3.5 bg-gray-950/80 rounded-xl border border-gray-800 space-y-2">
                  <p className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>Store these single-use codes safely. They will NOT be shown again!</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs text-gray-200">
                    {setupData.recoveryCodes.map((code, idx) => (
                      <div key={idx} className="p-1.5 bg-gray-900 border border-gray-800 rounded text-center font-bold">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3: Verification */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Step 3: Enter 6-digit verification code
                </p>
                <Input
                  label="Verification Code from Authenticator App"
                  placeholder="123456"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  leftIcon={<Lock size={15} />}
                  className="text-center font-mono text-base tracking-widest"
                  error={setupError}
                  disabled={isEnablingMfa}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsSetupModalOpen(false);
                    setSetupData(null);
                  }}
                  disabled={isEnablingMfa}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isEnablingMfa} leftIcon={<ShieldCheck size={16} />}>
                  Confirm & Enable 2FA
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MFA DISABLE MODAL ── */}
      {isDisableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldX className="text-rose-400" size={20} />
                <h2 className="text-base font-bold text-gray-50">Disable Two-Factor Authentication</h2>
              </div>
              <button
                onClick={() => setIsDisableModalOpen(false)}
                className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDisableMfa} className="space-y-4">
              <p className="text-xs text-gray-300">
                To confirm disabling two-factor authentication, please enter your current password and either a 6-digit authenticator code or recovery code.
              </p>

              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                leftIcon={<Lock size={15} />}
                disabled={isDisablingMfa}
              />

              {!useDisableRecovery ? (
                <Input
                  label="6-Digit Verification Code"
                  placeholder="123456"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  leftIcon={<Lock size={15} />}
                  className="text-center font-mono text-base tracking-widest"
                  disabled={isDisablingMfa}
                />
              ) : (
                <Input
                  label="Recovery Code"
                  placeholder="XXXX-XXXX-XXXX"
                  value={disableRecoveryCode}
                  onChange={(e) => setDisableRecoveryCode(e.target.value.toUpperCase())}
                  leftIcon={<Lock size={15} />}
                  className="text-center font-mono text-xs tracking-wider uppercase"
                  disabled={isDisablingMfa}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setUseDisableRecovery(!useDisableRecovery);
                  setDisableError('');
                }}
                className="text-xs text-accent-400 hover:text-accent-300 font-medium block text-center w-full cursor-pointer"
              >
                {useDisableRecovery ? 'Use 6-digit TOTP code instead' : 'Use emergency recovery code instead'}
              </button>

              {disableError && <p className="text-xs text-error font-medium text-center">{disableError}</p>}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsDisableModalOpen(false)}
                  disabled={isDisablingMfa}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" isLoading={isDisablingMfa} leftIcon={<ShieldX size={15} />}>
                  Disable MFA
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REGENERATE RECOVERY CODES MODAL ── */}
      {isRegenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="text-accent-400" size={18} />
                <h2 className="text-base font-bold text-gray-50">Regenerate Recovery Codes</h2>
              </div>
              <button
                onClick={() => setIsRegenModalOpen(false)}
                className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {!newRecoveryCodes ? (
              <form onSubmit={handleConfirmRegenCodes} className="space-y-4">
                <p className="text-xs text-gray-300">
                  Regenerating recovery codes will invalidate all previously generated recovery codes. Enter your password and 6-digit TOTP code to proceed.
                </p>

                <Input
                  label="Current Password"
                  type="password"
                  placeholder="••••••••"
                  value={regenPassword}
                  onChange={(e) => setRegenPassword(e.target.value)}
                  leftIcon={<Lock size={15} />}
                  disabled={isRegenerating}
                />

                <Input
                  label="6-Digit Verification Code"
                  placeholder="123456"
                  value={regenCode}
                  onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  leftIcon={<Lock size={15} />}
                  className="text-center font-mono text-base tracking-widest"
                  disabled={isRegenerating}
                />

                {regenError && <p className="text-xs text-error font-medium text-center">{regenError}</p>}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
                  <Button type="button" variant="secondary" onClick={() => setIsRegenModalOpen(false)} disabled={isRegenerating}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isRegenerating} leftIcon={<RefreshCw size={15} />}>
                    Generate New Codes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check size={15} />
                  <span>New recovery codes generated successfully!</span>
                </p>
                <div className="p-3.5 bg-gray-950/80 rounded-xl border border-gray-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs text-gray-200">
                    {newRecoveryCodes.map((code, idx) => (
                      <div key={idx} className="p-1.5 bg-gray-900 border border-gray-800 rounded text-center font-bold">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newRecoveryCodes.join('\n'));
                      setCopiedRegenCodes(true);
                      setTimeout(() => setCopiedRegenCodes(false), 2000);
                    }}
                    className="text-xs text-accent-400 hover:text-accent-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRegenCodes ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedRegenCodes ? 'Copied Codes' : 'Copy All Codes'}</span>
                  </button>

                  <Button type="button" onClick={() => setIsRegenModalOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ContentWrapper>
  );
}
