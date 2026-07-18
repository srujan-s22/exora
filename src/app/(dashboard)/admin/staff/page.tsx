'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search, Plus, X, Filter, Users, Eye, UserPlus,
  Shield, Mail, Lock, Building2, ChevronRight, Crown, Phone, KeyRound, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import type { Staff } from '@/types/staff.types';
import type { Exhibition } from '@/types/exhibition.types';
import type { PaginationMeta } from '@/types/api.types';
import type { TableColumn, BadgeVariant } from '@/types/ui.types';

const roleVariant: Record<string, BadgeVariant> = {
  super_admin: 'warning',
  admin: 'accent',
  counter: 'info',
  gate: 'success',
  ride: 'default',
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

export default function StaffManagementPage() {
  const { addToast } = useToast();
  const { hasPermission, isSuperAdmin } = useAuth();

  // List state
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false,
  });
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [exhibitions, setExhibitions] = React.useState<Exhibition[]>([]);
  const [createForm, setCreateForm] = React.useState({
    name: '', email: '', role: 'counter', password: '', phoneNumber: '', assignedExhibitions: [] as string[],
    superAdminSecret: '',
    permissions: {
      canCreateUsers: false,
      canResetPasswords: false,
      canViewAuditLogs: false,
      canManageStaff: false,
      canApproveResets: false,
      canCreateAdmins: false,
      canCreateExhibitions: false,
    }
  });
  const [createErrors, setCreateErrors] = React.useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = React.useState(false);

  // Password reset request state
  const [isRequestingReset, setIsRequestingReset] = React.useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch exhibitions for assign dropdown
  React.useEffect(() => {
    async function loadExhibitions() {
      try {
        const res = await fetch('/api/exhibitions?limit=100&includeArchived=false');
        if (!res.ok) return;
        const body = await res.json();
        if (body.success) {
          setExhibitions(body.data.data || body.data);
        }
      } catch {
        // Silent fail
      }
    }
    loadExhibitions();
  }, []);

  // Fetch staff
  const fetchStaff = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (roleFilter) queryParams.append('role', roleFilter);
      if (statusFilter) queryParams.append('status', statusFilter);

      const res = await fetch(`/api/staff?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch staff');

      const body = await res.json();
      if (body.success) {
        setStaff(body.data);
        setPagination(body.meta.pagination);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error loading staff', message: err.message || 'Please check your connection.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, roleFilter, statusFilter, addToast]);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };
  const hasFilters = search || roleFilter || statusFilter;

  // Create staff handler
  const handleCreateStaff = async () => {
    const errors: Record<string, string> = {};
    if (!createForm.name.trim()) errors.name = 'Name is required';
    if (!createForm.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(createForm.phoneNumber.trim())) {
      errors.phoneNumber = 'Must be a valid 10-digit Indian mobile number';
    }
    if (!createForm.password) {
      errors.password = 'Password is required';
    } else if (createForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(createForm.password)) {
      errors.password = 'Must contain an uppercase letter';
    } else if (!/[a-z]/.test(createForm.password)) {
      errors.password = 'Must contain a lowercase letter';
    } else if (!/[0-9]/.test(createForm.password)) {
      errors.password = 'Must contain a number';
    }
    if (createForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      errors.email = 'Invalid email address';
    }
    if (createForm.role === 'super_admin' && !createForm.superAdminSecret?.trim()) {
      errors.superAdminSecret = 'Super Admin Secret Key is required';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setIsCreating(true);
    setCreateErrors({});

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          phoneNumber: createForm.phoneNumber.trim(),
          email: createForm.email.trim() || undefined,
          role: createForm.role,
          password: createForm.password,
          assignedExhibitions: createForm.assignedExhibitions,
          permissions: createForm.role === 'admin' ? createForm.permissions : undefined,
          superAdminSecret: createForm.role === 'super_admin' ? createForm.superAdminSecret : undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create staff member');
      }

      addToast({
        type: 'success',
        title: 'Staff member created',
        message: `${body.data.name} (${body.data.staffId}) has been created successfully.`,
      });

      setShowCreateModal(false);
      setCreateForm({
        name: '', email: '', role: 'counter', password: '', phoneNumber: '', assignedExhibitions: [],
        superAdminSecret: '',
        permissions: {
          canCreateUsers: false,
          canResetPasswords: false,
          canViewAuditLogs: false,
          canManageStaff: false,
          canApproveResets: false,
          canCreateAdmins: false,
          canCreateExhibitions: false,
        }
      });
      fetchStaff();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Creation failed', message: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  // Quick Password Reset Request handler
  const handleRequestReset = async (phoneNumber: string) => {
    setIsRequestingReset(true);
    try {
      const res = await fetch('/api/password-resets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPhoneNumber: phoneNumber }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to submit reset request');
      }
      addToast({
        type: 'success',
        title: 'Reset request submitted',
        message: 'Awaiting super admin approval.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Request failed', message: err.message });
    } finally {
      setIsRequestingReset(false);
    }
  };

  // Determine allowed roles to create
  const getAllowedRoles = () => {
    if (isSuperAdmin) {
      return [
        { label: 'Super Admin', value: 'super_admin' },
        { label: 'Admin', value: 'admin' },
        { label: 'Counter Staff', value: 'counter' },
        { label: 'Gate Staff', value: 'gate' },
        { label: 'Ride Staff', value: 'ride' },
      ];
    }
    const roles = [
      { label: 'Counter Staff', value: 'counter' },
      { label: 'Gate Staff', value: 'gate' },
      { label: 'Ride Staff', value: 'ride' },
    ];
    if (hasPermission('canCreateAdmins')) {
      roles.push({ label: 'Admin', value: 'admin' });
    }
    return roles;
  };

  // Table columns
  const columns: TableColumn<Staff>[] = [
    {
      key: 'staffId',
      label: 'Staff ID',
      render: (_val, row) => (
        <Link
          href={`/admin/staff/${row.id}`}
          className="font-mono text-accent-300 hover:text-accent-400 transition-colors font-semibold text-xs tracking-wide"
        >
          {row.staffId}
        </Link>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (_val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-accent-500/10 text-accent-300 font-bold border border-accent-600/30 flex items-center justify-center text-[10px] rounded-lg uppercase select-none shrink-0">
            {row.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-gray-200 font-medium truncate">{row.name}</p>
              {row.role === 'super_admin' && (
                <span title="Super Admin">
                  <Crown size={12} className="text-amber-400 shrink-0" />
                </span>
              )}
            </div>
            {row.phoneNumber && <p className="text-[10px] text-gray-400 font-mono">{row.phoneNumber}</p>}
            {row.email && <p className="text-[10px] text-gray-500 truncate">{row.email}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (_val, row) => (
        <Badge variant={roleVariant[row.role] || 'default'}>
          <Shield size={10} className="mr-1" />
          {row.role === 'super_admin' ? 'Super Admin' : row.role.charAt(0).toUpperCase() + row.role.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (_val, row) => (
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-gray-600'}`} />
          <span className={`text-xs font-medium ${row.isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
            {row.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
    },
    {
      key: 'assignedExhibitions',
      label: 'Exhibitions',
      render: (_val, row) => {
        const exhList = row.assignedExhibitions as any[];
        const count = exhList?.length || 0;
        return (
          <span className="text-xs text-gray-400">
            {count === 0 ? '—' : `${count} assigned`}
          </span>
        );
      },
    },
    {
      key: 'lastLoginAt',
      label: 'Last Login',
      render: (_val, row) => (
        <span className="text-gray-400 text-xs whitespace-nowrap">
          {row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (_val, row) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/staff/${row.id}`}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-accent-400 hover:bg-gray-800 transition-colors"
            title="View details"
          >
            <Eye size={15} />
          </Link>
          {isSuperAdmin && row.role === 'admin' && (
            <Link
              href={`/admin/staff/${row.id}/permissions`}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-amber-400 hover:bg-gray-800 transition-colors"
              title="Manage Permissions"
            >
              <ShieldAlert size={15} />
            </Link>
          )}
          {hasPermission('canResetPasswords') && row.role !== 'super_admin' && (
            <button
              onClick={() => handleRequestReset(row.phoneNumber)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-error hover:bg-gray-800 transition-colors cursor-pointer"
              title="Request Password Reset"
              disabled={isRequestingReset}
            >
              <KeyRound size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Filter options
  const roleOptions = [
    { label: 'All Roles', value: '' },
    { label: 'Super Admin', value: 'super_admin' },
    { label: 'Admin', value: 'admin' },
    { label: 'Counter', value: 'counter' },
    { label: 'Gate', value: 'gate' },
    { label: 'Ride', value: 'ride' },
  ];
  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];
  const exhibitionOptions = exhibitions.map((e) => ({ label: e.name, value: e.id }));

  const canCreateStaff = isSuperAdmin || hasPermission('canCreateUsers');

  return (
    <>
      <div className="space-y-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-50">Staff Management</h1>
            <p className="mt-1 text-sm text-gray-400">
              Create, manage, and assign operations staff members.
            </p>
          </div>
          {canCreateStaff && (
            <Button
              className="shrink-0 flex items-center gap-1.5 font-semibold"
              onClick={() => setShowCreateModal(true)}
            >
              <UserPlus size={16} />
              <span>Add Staff Member</span>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
            <Filter size={12} className="text-accent-400" />
            <span>Search & Filter Controls</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by name, ID or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              className="w-full h-10"
            />

            <Select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              options={roleOptions}
              className="w-full"
            />

            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={statusOptions}
              className="w-full"
            />

            <div className="flex items-center gap-3">
              {hasFilters && (
                <Button
                  variant="secondary"
                  onClick={handleClearFilters}
                  className="h-10 px-3 shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                >
                  <X size={14} />
                  <span>Clear</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <Users size={13} className="text-accent-500" />
            <span className="font-semibold text-gray-200">{pagination.total.toLocaleString()}</span> staff members
          </span>
          {pagination.totalPages > 1 && (
            <span>Page {currentPage} of {pagination.totalPages}</span>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <Spinner size="lg" className="text-accent-500" />
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-xl bg-gray-900/10 p-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-500 mb-4 select-none">
              <Users size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-200">No Staff Members Found</h3>
            <p className="mt-1 text-sm text-gray-400 max-w-sm">
              {hasFilters
                ? "No staff members match your current filters. Try adjusting your search."
                : "No staff members have been created yet. Click 'Add Staff Member' to get started."}
            </p>
            {hasFilters ? (
              <Button variant="secondary" onClick={handleClearFilters} className="mt-4 text-xs font-semibold">
                Reset Search Filters
              </Button>
            ) : canCreateStaff ? (
              <Button onClick={() => setShowCreateModal(true)} className="mt-4 text-xs font-semibold">
                <UserPlus size={14} className="mr-1.5" />
                Add Staff Member
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <DataTable columns={columns} data={staff} />
            {pagination.totalPages > 1 && (
              <div className="pt-4 border-t border-gray-850">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Staff Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Staff Member"
        description="Create a new staff account with role and exhibition assignments."
        size="lg"
      >
        <div className="space-y-5">
          <Input
            label="Full Name"
            placeholder="Enter staff member's name"
            value={createForm.name}
            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
            error={createErrors.name}
            leftIcon={<Users size={14} />}
          />

          <Input
            label="Phone Number"
            placeholder="10-digit mobile number"
            value={createForm.phoneNumber}
            onChange={(e) => setCreateForm((p) => ({ ...p, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
            error={createErrors.phoneNumber}
            leftIcon={<Phone size={14} />}
          />

          <Input
            label="Email (Optional)"
            placeholder="staff@example.com"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
            error={createErrors.email}
            leftIcon={<Mail size={14} />}
          />

          <Select
            label="Role"
            value={createForm.role}
            onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
            options={getAllowedRoles()}
          />

          {createForm.role === 'super_admin' && (
            <Input
              label="Super Admin Secret Key"
              placeholder="Enter SUPER_ADMIN_SECRET to create super admin"
              type="password"
              value={createForm.superAdminSecret}
              onChange={(e) => setCreateForm((p) => ({ ...p, superAdminSecret: e.target.value }))}
              error={createErrors.superAdminSecret}
              leftIcon={<KeyRound size={14} />}
            />
          )}

          {isSuperAdmin && createForm.role === 'admin' && (
            <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Admin Permissions
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createForm.permissions.canCreateUsers}
                    onChange={(e) => setCreateForm((p) => ({
                      ...p,
                      permissions: { ...p.permissions, canCreateUsers: e.target.checked }
                    }))}
                    className="rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20"
                  />
                  <span>Create Users</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createForm.permissions.canCreateAdmins}
                    onChange={(e) => setCreateForm((p) => ({
                      ...p,
                      permissions: { ...p.permissions, canCreateAdmins: e.target.checked }
                    }))}
                    className="rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20"
                  />
                  <span>Create Admins</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createForm.permissions.canManageStaff}
                    onChange={(e) => setCreateForm((p) => ({
                      ...p,
                      permissions: { ...p.permissions, canManageStaff: e.target.checked }
                    }))}
                    className="rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20"
                  />
                  <span>Manage Staff</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createForm.permissions.canResetPasswords}
                    onChange={(e) => setCreateForm((p) => ({
                      ...p,
                      permissions: { ...p.permissions, canResetPasswords: e.target.checked }
                    }))}
                    className="rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20"
                  />
                  <span>Request Resets</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createForm.permissions.canViewAuditLogs}
                    onChange={(e) => setCreateForm((p) => ({
                      ...p,
                      permissions: { ...p.permissions, canViewAuditLogs: e.target.checked }
                    }))}
                    className="rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20"
                  />
                  <span>View Audit Logs</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createForm.permissions.canCreateExhibitions}
                    onChange={(e) => setCreateForm((p) => ({
                      ...p,
                      permissions: { ...p.permissions, canCreateExhibitions: e.target.checked }
                    }))}
                    className="rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20"
                  />
                  <span>Create Exhibitions</span>
                </label>
              </div>
            </div>
          )}

          <Input
            label="Password"
            placeholder="Min 8 characters, uppercase, lowercase, number"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
            error={createErrors.password}
            leftIcon={<Lock size={14} />}
          />

          {/* Exhibition Assignment */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">
              Assigned Exhibitions
            </label>
            {exhibitionOptions.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No exhibitions available to assign.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                {exhibitionOptions.map((exh) => (
                  <label
                    key={exh.value}
                    className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer select-none hover:text-gray-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={createForm.assignedExhibitions.includes(exh.value)}
                      onChange={(e) => {
                        setCreateForm((p) => ({
                          ...p,
                          assignedExhibitions: e.target.checked
                             ? [...p.assignedExhibitions, exh.value]
                             : p.assignedExhibitions.filter((id) => id !== exh.value),
                        }));
                      }}
                      className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-accent-500 focus:ring-accent-500/20 focus:ring-offset-gray-950 focus:ring-2 cursor-pointer transition-all checked:bg-accent-500 checked:border-transparent"
                    />
                    <Building2 size={12} className="text-gray-500 shrink-0" />
                    <span className="truncate">{exh.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-800/40">
            <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={isCreating}
              onClick={handleCreateStaff}
              leftIcon={<UserPlus size={14} />}
            >
              Create Staff Member
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
