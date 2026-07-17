'use client';

import * as React from 'react';
import {
  User, Settings, Monitor, Lock, Mail, Heading,
  Volume2, VolumeX, RefreshCw, Save, ShieldAlert,
  HelpCircle, UserCheck, Key, Shield, Info,
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

  // System Settings Form State
  const [systemForm, setSystemForm] = React.useState({
    siteTitle: 'EXORA',
    supportEmail: 'support@exora.com',
    defaultTicketValidity: 24,
    ticketPrefix: 'EXH',
    maxScansPerTicket: 1,
    lastUpdatedBy: '',
    lastUpdatedAt: '',
  });
  const [systemErrors, setSystemErrors] = React.useState<Record<string, string>>({});
  const [isSavingSystem, setIsSavingSystem] = React.useState(false);

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

      // 2. Fetch System Settings (only for Admins)
      if (authUser?.role === 'admin') {
        const settingsRes = await fetch('/api/admin/settings');
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
              lastUpdatedBy: s.updatedBy?.name ? `${s.updatedBy.name} (${s.updatedBy.staffId})` : 'System',
              lastUpdatedAt: new Date(s.updatedAt).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              }),
            });
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
      const payload: Record<string, any> = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim() || '',
      };
      if (profileForm.newPassword) {
        payload.password = profileForm.newPassword;
      }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
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
        body: JSON.stringify(systemForm),
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

  if (isLoading) {
    return (
      <ContentWrapper>
        <PageHeader title="Settings" description="System configuration and preferences." showDivider />
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      </ContentWrapper>
    );
  }

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: <User size={15} /> },
    ...(authUser?.role === 'admin' ? [{ id: 'system', label: 'System Configuration', icon: <Settings size={15} /> }] : []),
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
          )}

          {/* SYSTEM TAB (Admin only) */}
          {activeTab === 'system' && authUser?.role === 'admin' && (
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </ContentWrapper>
  );
}
