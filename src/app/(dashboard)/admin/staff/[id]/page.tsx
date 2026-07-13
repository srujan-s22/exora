'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, Mail, Calendar, Clock, User, Building2,
  Wifi, UserX, UserCheck, Key, Pencil, Save, X, AlertTriangle,
  Activity, Globe, Crown, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/providers/toast-provider';
import type { Staff } from '@/types/staff.types';
import type { BadgeVariant } from '@/types/ui.types';

interface StaffDetail extends Omit<Staff, 'createdBy'> {
  recentActivity?: AuditLogEntry[];
  createdBy?: { name: string; staffId: string } | string;
  lastLoginIp?: string;
  _currentUserIsSuperAdmin?: boolean;
  _isCurrentUser?: boolean;
}

interface AuditLogEntry {
  id: string;
  action: string;
  performedBy?: { name?: string; staffId?: string } | string;
  details?: Record<string, any>;
  timestamp: string;
}

const roleVariant: Record<string, BadgeVariant> = {
  admin: 'accent',
  counter: 'info',
  gate: 'success',
};

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAuditAction(action: string): string {
  return action
    .replace(/\./g, ' → ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();

  const [staff, setStaff] = React.useState<StaffDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Edit state
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: '', email: '', role: '', password: '', assignedExhibitions: [] as string[],
  });
  const [editErrors, setEditErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Deactivate / reactivate state
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);

  // Exhibitions for assignment
  const [exhibitions, setExhibitions] = React.useState<{ id: string; name: string }[]>([]);

  // Fetch staff detail
  const fetchStaff = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/staff/${id}`);
      if (!res.ok) throw new Error('Failed to load staff member');
      const body = await res.json();
      if (body.success) {
        setStaff(body.data);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error loading staff', message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [id, addToast]);

  React.useEffect(() => {
    if (id) fetchStaff();
  }, [id, fetchStaff]);

  // Load exhibitions
  React.useEffect(() => {
    async function loadExhibitions() {
      try {
        const res = await fetch('/api/exhibitions?limit=100&includeArchived=false');
        if (!res.ok) return;
        const body = await res.json();
        if (body.success) {
          const list = body.data.data || body.data;
          setExhibitions(list.map((e: any) => ({ id: e.id, name: e.name })));
        }
      } catch {
        // Silent
      }
    }
    loadExhibitions();
  }, []);

  // Begin editing
  const handleStartEdit = () => {
    if (!staff) return;
    setEditForm({
      name: staff.name,
      email: staff.email || '',
      role: staff.role,
      password: '',
      assignedExhibitions: (staff.assignedExhibitions as any[]).map((e: any) =>
        typeof e === 'string' ? e : e.id || e._id?.toString()
      ),
    });
    setEditErrors({});
    setIsEditing(true);
  };

  // Save edits
  const handleSaveEdit = async () => {
    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = 'Name is required';
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = 'Invalid email address';
    }
    if (editForm.password) {
      if (editForm.password.length < 8) errors.password = 'Min 8 characters';
      else if (!/[A-Z]/.test(editForm.password)) errors.password = 'Must contain uppercase';
      else if (!/[a-z]/.test(editForm.password)) errors.password = 'Must contain lowercase';
      else if (!/[0-9]/.test(editForm.password)) errors.password = 'Must contain number';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSaving(true);
    setEditErrors({});

    try {
      const payload: Record<string, any> = {
        name: editForm.name.trim(),
        email: editForm.email.trim() || '',
        role: editForm.role,
        assignedExhibitions: editForm.assignedExhibitions,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update staff member');
      }

      addToast({ type: 'success', title: 'Staff updated', message: 'Changes saved successfully.' });
      setIsEditing(false);
      fetchStaff();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async () => {
    if (!staff) return;
    setIsToggling(true);
    try {
      if (staff.isActive) {
        // Deactivate via DELETE
        const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.error?.message || 'Failed to deactivate');
        }
        addToast({ type: 'success', title: 'Staff deactivated', message: `${staff.name} has been deactivated.` });
      } else {
        // Reactivate via PATCH
        const res = await fetch(`/api/staff/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.error?.message || 'Failed to reactivate');
        }
        addToast({ type: 'success', title: 'Staff reactivated', message: `${staff.name} has been reactivated.` });
      }
      setShowToggleModal(false);
      fetchStaff();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action failed', message: err.message });
    } finally {
      setIsToggling(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  // Not found state
  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-500 mb-4">
          <User size={28} />
        </div>
        <h2 className="text-lg font-bold text-gray-200">Staff Member Not Found</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-sm">The staff member you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Button variant="secondary" onClick={() => router.push('/admin/staff')} className="mt-4">
          Back to Staff
        </Button>
      </div>
    );
  }

  const createdBy = staff.createdBy as any;
  const assignedExhibitions = (staff.assignedExhibitions || []) as any[];
  const canModify = !(staff.role === 'admin' && !staff._isCurrentUser && !staff._currentUserIsSuperAdmin);

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/admin/staff"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-accent-400 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Staff</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
              <span className="text-accent-400 font-bold text-lg uppercase select-none">
                {staff.name.slice(0, 2)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-gray-50">{staff.name}</h1>
                {staff.isSuperAdmin && (
                  <Badge variant="accent" className="flex items-center gap-1.5 py-0.5">
                    <Crown size={11} className="text-amber-400" />
                    <span>Super Admin</span>
                  </Badge>
                )}
                <Badge variant={roleVariant[staff.role] || 'default'}>
                  <Shield size={10} className="mr-1" />
                  {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${staff.isActive ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                  <span className={`text-xs font-medium ${staff.isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {staff.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-0.5 font-mono tracking-wide">{staff.staffId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                {canModify && (
                  <>
                    <Button variant="secondary" size="sm" onClick={handleStartEdit} leftIcon={<Pencil size={14} />}>
                      Edit
                    </Button>
                    <Button
                      variant={staff.isActive ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => setShowToggleModal(true)}
                      leftIcon={staff.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    >
                      {staff.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} leftIcon={<X size={14} />}>
                  Cancel
                </Button>
                <Button size="sm" isLoading={isSaving} onClick={handleSaveEdit} leftIcon={<Save size={14} />}>
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        {!canModify && (
          <div className="rounded-lg bg-warning/5 border border-warning/20 p-4 flex items-center gap-3 select-none">
            <AlertTriangle size={20} className="text-warning shrink-0" />
            <div>
              <p className="text-sm font-semibold text-warning">Access Restricted</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Standard administrators do not have permission to modify or deactivate peer admin accounts. Only a Super Admin can perform these actions.
              </p>
            </div>
          </div>
        )}

        {/* Detail Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User size={14} className="text-accent-400" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    label="Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    error={editErrors.name}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    error={editErrors.email}
                    leftIcon={<Mail size={14} />}
                  />
                  <Select
                    label="Role"
                    value={editForm.role}
                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                    options={[
                      { label: 'Admin', value: 'admin' },
                      { label: 'Counter', value: 'counter' },
                      { label: 'Gate', value: 'gate' },
                    ]}
                  />
                  <Input
                    label="New Password (leave blank to keep current)"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                    error={editErrors.password}
                    leftIcon={<Key size={14} />}
                    placeholder="Min 8 chars, upper, lower, number"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Full Name" value={staff.name} />
                  <DetailItem label="Staff ID" value={staff.staffId} mono />
                  <DetailItem label="Email" value={staff.email || '—'} icon={<Mail size={12} />} />
                  <DetailItem label="Role" value={staff.role.charAt(0).toUpperCase() + staff.role.slice(1)} icon={<Shield size={12} />} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access & Security */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield size={14} className="text-accent-400" />
                Access & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <DetailItem
                  label="Status"
                  value={staff.isActive ? 'Active' : 'Inactive'}
                  icon={staff.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                />
                <DetailItem
                  label="Last Login"
                  value={staff.lastLoginAt ? formatDate(staff.lastLoginAt) : 'Never'}
                  icon={<Clock size={12} />}
                />
                <DetailItem
                  label="Last Login IP"
                  value={staff.lastLoginIp || '—'}
                  icon={<Globe size={12} />}
                  mono
                />
                <DetailItem
                  label="Created"
                  value={staff.createdAt ? formatDate(staff.createdAt) : '—'}
                  icon={<Calendar size={12} />}
                />
                <DetailItem
                  label="Created By"
                  value={createdBy?.name ? `${createdBy.name} (${createdBy.staffId})` : '—'}
                />
                <DetailItem
                  label="Last Updated"
                  value={staff.updatedAt ? formatDate(staff.updatedAt) : '—'}
                  icon={<Clock size={12} />}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assigned Exhibitions */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 size={14} className="text-accent-400" />
                Assigned Exhibitions
                <span className="ml-auto text-xs text-gray-500 font-normal">
                  {assignedExhibitions.length} assigned
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {exhibitions.length === 0 ? (
                    <p className="text-xs text-gray-500 italic col-span-2">No exhibitions available.</p>
                  ) : (
                    exhibitions.map((exh) => (
                      <label
                        key={exh.id}
                        className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer select-none hover:text-gray-100 transition-colors p-2 rounded-md hover:bg-gray-800/50"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.assignedExhibitions.includes(exh.id)}
                          onChange={(e) => {
                            setEditForm((p) => ({
                              ...p,
                              assignedExhibitions: e.target.checked
                                ? [...p.assignedExhibitions, exh.id]
                                : p.assignedExhibitions.filter((eid) => eid !== exh.id),
                            }));
                          }}
                          className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20 focus:ring-offset-gray-950 focus:ring-2 cursor-pointer transition-all checked:bg-accent-500 checked:border-transparent"
                        />
                        <Building2 size={12} className="text-gray-500 shrink-0" />
                        <span className="truncate">{exh.name}</span>
                      </label>
                    ))
                  )}
                </div>
              ) : assignedExhibitions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No exhibitions assigned to this staff member.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assignedExhibitions.map((exh: any, i: number) => {
                    const name = typeof exh === 'string' ? exh : exh.name;
                    const exhStatus = typeof exh === 'object' ? exh.status : undefined;
                    return (
                      <div
                        key={typeof exh === 'string' ? exh : exh.id || i}
                        className="flex items-center gap-2.5 p-2.5 rounded-md bg-gray-800/30 border border-gray-800"
                      >
                        <Building2 size={14} className="text-accent-400 shrink-0" />
                        <span className="text-sm text-gray-200 truncate">{name || 'Unknown Exhibition'}</span>
                        {exhStatus && (
                          <Badge variant="default" className="ml-auto text-[10px]">{exhStatus}</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity size={14} className="text-accent-400" />
                Recent Activity
                <span className="ml-auto text-xs text-gray-500 font-normal">
                  {staff.recentActivity?.length || 0} entries
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!staff.recentActivity || staff.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No activity recorded yet.</p>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                  {staff.recentActivity.map((log, i) => {
                    const performer = typeof log.performedBy === 'object'
                      ? log.performedBy
                      : null;
                    return (
                      <div
                        key={log.id || i}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-gray-800/30 transition-colors text-xs"
                      >
                        <div className="mt-0.5 h-6 w-6 rounded-md bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-500 shrink-0">
                          <Activity size={11} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-200 font-medium">
                            {formatAuditAction(log.action)}
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            {performer?.name && (
                              <span>
                                by <span className="text-gray-400 font-mono">{performer.staffId}</span>
                                {' '}({performer.name})
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-gray-500 whitespace-nowrap shrink-0">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deactivate/Reactivate Confirmation Modal */}
      <Modal
        open={showToggleModal}
        onClose={() => setShowToggleModal(false)}
        title={staff.isActive ? 'Deactivate Staff Member' : 'Reactivate Staff Member'}
        description={
          staff.isActive
            ? 'Are you sure you want to deactivate this staff member? They will no longer be able to log in.'
            : 'Are you sure you want to reactivate this staff member? They will regain access to the system.'
        }
      >
        <div className="space-y-4 pt-2">
          <div className={`rounded-lg p-4 ${staff.isActive ? 'bg-error/5 border border-error/20' : 'bg-emerald-500/5 border border-emerald-500/20'}`}>
            <div className="flex items-center gap-3">
              {staff.isActive ? (
                <AlertTriangle size={20} className="text-error shrink-0" />
              ) : (
                <UserCheck size={20} className="text-emerald-400 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-semibold ${staff.isActive ? 'text-error' : 'text-emerald-400'}`}>
                  {staff.isActive
                    ? 'This will revoke all access'
                    : 'This will restore access'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Staff member <span className="font-mono text-gray-300">{staff.staffId}</span> ({staff.name}) will be {staff.isActive ? 'deactivated' : 'reactivated'}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowToggleModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant={staff.isActive ? 'danger' : 'primary'}
              size="sm"
              isLoading={isToggling}
              onClick={handleToggleActive}
              leftIcon={staff.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
            >
              {staff.isActive ? 'Yes, Deactivate' : 'Yes, Reactivate'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Reusable detail item */
function DetailItem({
  label,
  value,
  icon,
  mono,
  className = '',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`text-sm text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </p>
    </div>
  );
}
