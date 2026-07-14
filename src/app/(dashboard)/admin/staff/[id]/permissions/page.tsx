'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, Shield, ShieldCheck, Save, Users, KeyRound,
  ScrollText, UserPlus, CheckCircle, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';

interface PermissionItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const PERMISSION_ITEMS: PermissionItem[] = [
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
    description: 'Allows editing and deactivating staff members.',
    icon: <Users size={16} />,
  },
  {
    key: 'canResetPasswords',
    label: 'Request Password Resets',
    description: 'Allows submitting password reset requests for staff members.',
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
];

export default function PermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();
  const { isSuperAdmin } = useAuth();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [staffInfo, setStaffInfo] = React.useState<{
    name: string;
    staffId: string;
    role: string;
    permissions: Record<string, boolean>;
  } | null>(null);
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    async function loadPermissions() {
      try {
        const res = await fetch(`/api/staff/${id}/permissions`);
        if (!res.ok) throw new Error('Failed to load');
        const body = await res.json();
        if (body.success) {
          setStaffInfo(body.data);
          setPermissions(body.data.permissions || {});
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
      setHasChanges(true);
      return updated;
    });
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
      addToast({ type: 'success', title: 'Permissions saved', message: `Permissions updated for ${staffInfo?.name || 'staff member'}.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-center">
        <div>
          <Lock size={40} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-200">Access Restricted</h2>
          <p className="text-sm text-gray-400 mt-1">Only super admins can manage user permissions.</p>
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
          <h2 className="text-lg font-bold text-gray-200">Staff Not Found</h2>
          <Button variant="secondary" className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = staffInfo.role === 'admin';

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

      {/* Permission description */}
      {!isAdmin && (
        <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
          <p className="text-sm text-gray-300">
            Permissions can only be managed for <strong>admin</strong> users. {staffInfo.role === 'super_admin' ? 'Super admins have all permissions by default.' : `${staffInfo.role} users have fixed permissions based on their role.`}
          </p>
        </div>
      )}

      {/* Permission toggles */}
      {isAdmin && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
            Permission Controls
          </h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 divide-y divide-gray-800/50">
            {PERMISSION_ITEMS.map((item) => {
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

      {/* Save button */}
      {isAdmin && hasChanges && (
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
