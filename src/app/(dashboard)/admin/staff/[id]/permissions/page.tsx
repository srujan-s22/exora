'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, Shield, ShieldCheck, Save, Users, KeyRound,
  ScrollText, UserPlus, CheckCircle, Lock, Plus, Ticket, Gamepad2,
  Printer, History, AlertCircle, Sparkles, XCircle, Calendar, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { COUNTER_PERMISSION_PRESETS } from '@/lib/config/counter-permission-presets';

interface PermissionItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const ADMIN_PERMISSION_ITEMS: PermissionItem[] = [
  {
    key: 'canCreateUsers',
    label: 'Create Users',
    description: 'Allows creating counter, gate, and ride staff members.',
    icon: <UserPlus size={16} />,
  },
  {
    key: 'canCreateAdmins',
    label: 'Create Admins',
    description: 'Allows creating other admin users. Requires "Create Users" permission.',
    icon: <Shield size={16} />,
  },
  {
    key: 'canManageStaff',
    label: 'Manage Staff',
    description: 'Allows editing, deactivating, and updating permissions of staff.',
    icon: <Users size={16} />,
  },
  {
    key: 'canResetPasswords',
    label: 'Reset Passwords',
    description: 'Allows submitting password reset requests for staff.',
    icon: <KeyRound size={16} />,
  },
  {
    key: 'canApproveResets',
    label: 'Approve Password Resets',
    description: 'Reserved for Super Admins. This permission has no effect on admin users.',
    icon: <CheckCircle size={16} />,
  },
  {
    key: 'canViewAuditLogs',
    label: 'View Audit Logs',
    description: 'Allows viewing the system audit log.',
    icon: <ScrollText size={16} />,
  },
  {
    key: 'canManageSessions',
    label: 'Manage Active Sessions & Security',
    description: 'Allows complete view and control of system-wide active sessions, devices, and remote session revocation.',
    icon: <Globe size={16} />,
  },
  {
    key: 'canCreateExhibitions',
    label: 'Create Exhibitions',
    description: 'Allows creating new exhibitions.',
    icon: <Plus size={16} />,
  },
  {
    key: 'canManageExhibitions',
    label: 'Manage Exhibition Lifecycle',
    description: 'Allows pausing, resuming, extending, and manually ending exhibition lifecycles.',
    icon: <Calendar size={16} />,
  },
  {
    key: 'canApproveTicketCancellation',
    label: 'Approve Ticket Cancellations',
    description: 'Allows reviewing, approving, and rejecting counter ticket cancellation requests.',
    icon: <XCircle size={16} />,
  },
];

const COUNTER_ENTRY_ITEMS: PermissionItem[] = [
  {
    key: 'canSellEntryTickets',
    label: 'Sell Entry Tickets',
    description: 'Allows issuing main entry tickets at the counter terminal.',
    icon: <Ticket size={16} />,
  },
  {
    key: 'canViewEntrySales',
    label: 'View Entry Sales History',
    description: 'Allows viewing past entry ticket sale transaction logs.',
    icon: <History size={16} />,
  },
  {
    key: 'canReprintEntryTickets',
    label: 'Reprint Entry Tickets',
    description: 'Allows reprinting duplicate entry tickets from history.',
    icon: <Printer size={16} />,
  },
  {
    key: 'canCancelEntryTickets',
    label: 'Cancel Entry Transactions',
    description: 'Allows voiding/cancelling entry ticket transactions within window.',
    icon: <AlertCircle size={16} />,
  },
];

const COUNTER_RIDE_ITEMS: PermissionItem[] = [
  {
    key: 'canSellRideTickets',
    label: 'Sell Ride Tickets',
    description: 'Allows issuing ride tickets at the counter terminal.',
    icon: <Gamepad2 size={16} />,
  },
  {
    key: 'canViewRideSales',
    label: 'View Ride Sales History',
    description: 'Allows viewing past ride ticket sale transaction logs.',
    icon: <History size={16} />,
  },
  {
    key: 'canReprintRideTickets',
    label: 'Reprint Ride Tickets',
    description: 'Allows reprinting duplicate ride tickets from history.',
    icon: <Printer size={16} />,
  },
  {
    key: 'canCancelRideTickets',
    label: 'Cancel Ride Transactions',
    description: 'Allows voiding/cancelling ride ticket transactions within window.',
    icon: <AlertCircle size={16} />,
  },
];

export default function PermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();
  const { isSuperAdmin, hasPermission } = useAuth();

  const canManage = isSuperAdmin || hasPermission('canManageStaff');

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [staffInfo, setStaffInfo] = React.useState<{
    name: string;
    staffId: string;
    role: string;
    permissions: Record<string, boolean>;
  } | null>(null);
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({});
  const [selectedPresetId, setSelectedPresetId] = React.useState<string>('custom');
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    async function loadPermissions() {
      try {
        const res = await fetch(`/api/staff/${id}/permissions`);
        if (!res.ok) throw new Error('Failed to load permissions');
        const body = await res.json();
        if (body.success) {
          setStaffInfo(body.data);
          setPermissions(body.data.permissions || {});
          
          // Detect matching preset for counter staff
          if (body.data.role === 'counter') {
            const perms = body.data.permissions || {};
            const isEntryOnly = perms.canSellEntryTickets && perms.canViewEntrySales && perms.canReprintEntryTickets && perms.canCancelEntryTickets && !perms.canSellRideTickets && !perms.canViewRideSales;
            const isRideOnly = perms.canSellRideTickets && perms.canViewRideSales && perms.canReprintRideTickets && perms.canCancelRideTickets && !perms.canSellEntryTickets && !perms.canViewEntrySales;
            const isFull = perms.canSellEntryTickets && perms.canSellRideTickets && perms.canViewEntrySales && perms.canViewRideSales;
            
            if (isEntryOnly) setSelectedPresetId('entry_counter');
            else if (isRideOnly) setSelectedPresetId('ride_counter');
            else if (isFull) setSelectedPresetId('full_counter');
            else setSelectedPresetId('custom');
          }
        }
      } catch (err: any) {
        addToast({ type: 'error', title: 'Error', message: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    loadPermissions();
  }, [id, addToast]);

  const togglePermission = (key: string) => {
    setPermissions((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setSelectedPresetId('custom');
      setHasChanges(true);
      return updated;
    });
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') return;

    const preset = COUNTER_PERMISSION_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.permissions) {
      setPermissions((prev) => ({
        ...prev,
        ...preset.permissions,
      }));
      setHasChanges(true);
      addToast({
        type: 'info',
        title: 'Preset Selected',
        message: `Applied "${preset.label}" template permissions. Save changes to finalize.`,
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/staff/${id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to save');

      setHasChanges(false);
      addToast({
        type: 'success',
        title: 'Permissions Saved',
        message: `Permissions updated for ${staffInfo?.name || 'staff member'}.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-center">
        <div>
          <Lock size={40} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-200">Access Restricted</h2>
          <p className="text-sm text-gray-400 mt-1">You do not have permission to manage staff permissions.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  if (!staffInfo) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-center">
        <div>
          <h2 className="text-lg font-bold text-gray-200">Staff Member Not Found</h2>
          <Button variant="secondary" className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = staffInfo.role === 'admin';
  const isCounter = staffInfo.role === 'counter';
  const isConfigurable = isAdmin || isCounter;

  return (
    <div className="space-y-6 flex flex-col flex-1 max-w-3xl">
      {/* Back button */}
      <Button
        variant="ghost"
        className="self-start flex items-center gap-1 text-gray-400 hover:text-gray-200 -ml-2"
        onClick={() => router.back()}
      >
        <ChevronLeft size={16} />
        <span className="text-xs font-medium">Back to Staff</span>
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-accent-500/10 text-accent-300 font-bold border border-accent-600/30 flex items-center justify-center text-sm rounded-xl uppercase select-none shrink-0">
          {staffInfo.name.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-50 flex items-center gap-2">
            {staffInfo.name}
            <Badge variant="accent" className="text-[10px]">
              <ShieldCheck size={10} className="mr-0.5" />
              {staffInfo.role.replace('_', ' ').toUpperCase()}
            </Badge>
          </h1>
          <p className="text-sm text-gray-400 font-mono">{staffInfo.staffId}</p>
        </div>
      </div>

      {/* Unconfigurable Notice */}
      {!isConfigurable && (
        <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
          <p className="text-sm text-gray-300">
            Permissions can only be configured for <strong>admin</strong> and <strong>counter</strong> staff members.{' '}
            {staffInfo.role === 'super_admin' ? 'Super admins have all permissions by default.' : `${staffInfo.role.toUpperCase()} role has fixed operational permissions.`}
          </p>
        </div>
      )}

      {/* Counter Permission Presets (Refinement 1) */}
      {isCounter && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-400" />
            <h2 className="text-sm font-bold text-gray-200">Permission Presets</h2>
          </div>
          <p className="text-xs text-gray-400">
            Select a preset template to auto-populate counter permissions, or customize individual toggles below.
          </p>
          <Select
            label="Template Preset"
            value={selectedPresetId}
            onChange={(e) => handleApplyPreset(e.target.value)}
            options={COUNTER_PERMISSION_PRESETS.map((p) => ({
              label: `${p.label} - ${p.description}`,
              value: p.id,
            }))}
          />
        </div>
      )}

      {/* Admin Permissions List */}
      {isAdmin && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
            Admin System Permissions
          </h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 divide-y divide-gray-800/50">
            {ADMIN_PERMISSION_ITEMS.map((item) => {
              const isEnabled = !!permissions[item.key];
              const isReserved = item.key === 'canApproveResets';
              return (
                <div
                  key={item.key}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    isReserved ? 'opacity-50' : 'hover:bg-gray-850/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isEnabled
                        ? 'bg-accent-500/10 text-accent-300 border border-accent-600/30'
                        : 'bg-gray-800 text-gray-500 border border-gray-700/50'
                    }`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-200">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isReserved && togglePermission(item.key)}
                    disabled={isReserved}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                      isEnabled ? 'bg-accent-500' : 'bg-gray-700'
                    } ${isReserved ? 'cursor-not-allowed' : ''}`}
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`Toggle ${item.label}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Counter Permissions List */}
      {isCounter && (
        <div className="space-y-6">
          {/* Entry Operations Group */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider select-none flex items-center gap-2">
              <Ticket size={14} className="text-accent-400" />
              <span>Main Entry Operations</span>
            </h2>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 divide-y divide-gray-800/50">
              {COUNTER_ENTRY_ITEMS.map((item) => {
                const isEnabled = !!permissions[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 hover:bg-gray-850/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isEnabled
                          ? 'bg-accent-500/10 text-accent-300 border border-accent-600/30'
                          : 'bg-gray-800 text-gray-500 border border-gray-700/50'
                      }`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-200">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => togglePermission(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                        isEnabled ? 'bg-accent-500' : 'bg-gray-700'
                      }`}
                      role="switch"
                      aria-checked={isEnabled}
                      aria-label={`Toggle ${item.label}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ride Operations Group */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider select-none flex items-center gap-2">
              <Gamepad2 size={14} className="text-accent-400" />
              <span>Ride Ticket Operations</span>
            </h2>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 divide-y divide-gray-800/50">
              {COUNTER_RIDE_ITEMS.map((item) => {
                const isEnabled = !!permissions[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 hover:bg-gray-850/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isEnabled
                          ? 'bg-accent-500/10 text-accent-300 border border-accent-600/30'
                          : 'bg-gray-800 text-gray-500 border border-gray-700/50'
                      }`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-200">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => togglePermission(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                        isEnabled ? 'bg-accent-500' : 'bg-gray-700'
                      }`}
                      role="switch"
                      aria-checked={isEnabled}
                      aria-label={`Toggle ${item.label}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      {isConfigurable && hasChanges && (
        <div className="sticky bottom-6 flex justify-end">
          <Button
            isLoading={isSaving}
            onClick={handleSave}
            leftIcon={<Save size={14} />}
            className="shadow-xl font-semibold"
          >
            Save Permissions
          </Button>
        </div>
      )}
    </div>
  );
}
