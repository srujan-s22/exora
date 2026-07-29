'use client';

import * as React from 'react';
import {
  Bell,
  Send,
  Users,
  Megaphone,
  AlertTriangle,
  Info,
  Shield,
  Ticket,
  ScanLine,
  Gamepad2,
  CheckSquare,
  Square,
  History,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { DataTable } from '@/components/ui/data-table';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { TableSkeleton } from '@/components/shared/skeletons';
import type { UserRoleType } from '@/lib/config/roles';
import type { TableColumn } from '@/types/ui.types';

interface BroadcastLog {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'alert' | 'system' | 'info';
  createdAt: string;
  sender?: { name: string; role: string };
  recipient?: { name: string; role: string; staffId?: string };
}

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [targetType, setTargetType] = React.useState<'roles' | 'all'>('roles');
  const [selectedRoles, setSelectedRoles] = React.useState<UserRoleType[]>([
    'admin',
    'counter',
    'gate',
    'ride',
  ]);

  const [title, setTitle] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [notificationType, setNotificationType] = React.useState<'announcement' | 'alert' | 'system' | 'info'>('announcement');

  const [isSending, setIsSending] = React.useState(false);
  const [historyLogs, setHistoryLogs] = React.useState<BroadcastLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true);

  // Load sent broadcast history
  const fetchHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/notifications/history');
      if (!res.ok) return;
      const body = await res.json();
      if (body.success) {
        setHistoryLogs(body.data || []);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Access check: Super Admin only
  if (user && user.role !== 'super_admin') {
    return (
      <ContentWrapper>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
            <Bell size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-150">Super Admin Access Only</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-md">
            Only Super Administrators can broadcast system-wide notifications to staff users.
          </p>
        </div>
      </ContentWrapper>
    );
  }

  const toggleRole = (role: UserRoleType) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSelectAllRoles = () => {
    setSelectedRoles(['admin', 'counter', 'gate', 'ride']);
  };

  const handleClearRoles = () => {
    setSelectedRoles([]);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Please enter a notification title.' });
      return;
    }

    if (!message.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Please enter a notification message.' });
      return;
    }

    if (targetType === 'roles' && selectedRoles.length === 0) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Please select at least one target user role.' });
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetRoles: targetType === 'roles' ? selectedRoles : undefined,
          title,
          message,
          type: notificationType,
        }),
      });

      const body = await res.json();

      if (res.ok && body.success) {
        addToast({
          type: 'success',
          title: 'Notification Broadcast Sent!',
          message: `Successfully delivered notification to ${body.data.sentCount} recipient user(s).`,
        });
        setTitle('');
        setMessage('');
        fetchHistory();
      } else {
        throw new Error(body.error?.message || 'Failed to send notification');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Broadcast Failed',
        message: err.message || 'An error occurred while dispatching notifications.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const columns: TableColumn<BroadcastLog>[] = [
    {
      key: 'title',
      label: 'Notification',
      render: (_val, row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-gray-200 text-xs flex items-center gap-2">
            <span>{row.title}</span>
            <Badge variant={row.type === 'alert' ? 'error' : row.type === 'announcement' ? 'accent' : 'info'}>
              {row.type}
            </Badge>
          </div>
          <p className="text-gray-400 text-xs line-clamp-1 max-w-md">{row.message}</p>
        </div>
      ),
    },
    {
      key: 'recipient',
      label: 'Recipient',
      render: (_val, row) => (
        <div className="text-xs">
          <span className="text-gray-200 font-medium">{row.recipient?.name || 'User'}</span>
          <span className="text-gray-500 block uppercase text-[10px]">{row.recipient?.role}</span>
        </div>
      ),
    },
    {
      key: 'sender',
      label: 'Sender',
      render: (_val, row) => (
        <span className="text-gray-300 text-xs">{row.sender?.name || 'Super Admin'}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Sent Date',
      render: (_val, row) => (
        <span className="text-gray-400 text-xs whitespace-nowrap">
          {new Date(row.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <ContentWrapper>
      <PageHeader
        title="Broadcast Notifications Console"
        description="Dispatch real-time in-app announcements, operational alerts, and system notices to selected staff roles."
        showDivider
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Broadcast Composer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-900 border-gray-800 shadow-xl">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Megaphone size={16} className="text-accent-400" />
                <span>Compose Broadcast Notification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSendNotification} className="space-y-6">
                {/* 1. Target Audience Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                    <span>1. Select Target Recipient Roles</span>
                    <div className="flex gap-3 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllRoles}
                        className="text-accent-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearRoles}
                        className="text-gray-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Admins */}
                    <button
                      type="button"
                      onClick={() => toggleRole('admin')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedRoles.includes('admin')
                          ? 'bg-accent-500/10 border-accent-500/40 text-accent-300 shadow-sm'
                          : 'bg-gray-850/50 border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Shield size={18} />
                        {selectedRoles.includes('admin') ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div>
                        <span className="font-bold text-xs block text-gray-200">Admins</span>
                        <span className="text-[10px] text-gray-400">Managers</span>
                      </div>
                    </button>

                    {/* Counter Staff */}
                    <button
                      type="button"
                      onClick={() => toggleRole('counter')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedRoles.includes('counter')
                          ? 'bg-accent-500/10 border-accent-500/40 text-accent-300 shadow-sm'
                          : 'bg-gray-850/50 border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Ticket size={18} />
                        {selectedRoles.includes('counter') ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div>
                        <span className="font-bold text-xs block text-gray-200">Counter Staff</span>
                        <span className="text-[10px] text-gray-400">Ticketing</span>
                      </div>
                    </button>

                    {/* Gate Staff */}
                    <button
                      type="button"
                      onClick={() => toggleRole('gate')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedRoles.includes('gate')
                          ? 'bg-accent-500/10 border-accent-500/40 text-accent-300 shadow-sm'
                          : 'bg-gray-850/50 border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <ScanLine size={18} />
                        {selectedRoles.includes('gate') ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div>
                        <span className="font-bold text-xs block text-gray-200">Gate Staff</span>
                        <span className="text-[10px] text-gray-400">Verifiers</span>
                      </div>
                    </button>

                    {/* Ride Operators */}
                    <button
                      type="button"
                      onClick={() => toggleRole('ride')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedRoles.includes('ride')
                          ? 'bg-accent-500/10 border-accent-500/40 text-accent-300 shadow-sm'
                          : 'bg-gray-850/50 border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Gamepad2 size={18} />
                        {selectedRoles.includes('ride') ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div>
                        <span className="font-bold text-xs block text-gray-200">Ride Operators</span>
                        <span className="text-[10px] text-gray-400">Rides & Games</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Notification Category & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Notification Category</label>
                    <Select
                      value={notificationType}
                      onChange={(e) => setNotificationType(e.target.value as any)}
                      options={[
                        { label: 'Announcement', value: 'announcement' },
                        { label: 'Urgent Alert', value: 'alert' },
                        { label: 'System Notice', value: 'system' },
                        { label: 'General Info', value: 'info' },
                      ]}
                      className="w-full h-10"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Notification Title</label>
                    <Input
                      placeholder="e.g., Gate 2 Maintenance Notice / Peak Sales Shift"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-10"
                    />
                  </div>
                </div>

                {/* 3. Notification Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Notification Message</label>
                  <textarea
                    rows={4}
                    placeholder="Type message content to broadcast to selected staff users..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 p-3 text-sm text-gray-100 placeholder-gray-500 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    isLoading={isSending}
                    className="font-bold flex items-center gap-2 px-6 h-11"
                  >
                    <Send size={16} />
                    <span>Send Notification Broadcast</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Preview & Guidance Card */}
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-800 shadow-xl">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Users size={16} className="text-accent-400" />
                <span>Selected Recipient Audience</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3">
                <span className="text-xs text-gray-400 block font-medium">Target Roles Selected:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRoles.length === 0 ? (
                    <span className="text-xs text-red-400 italic">No roles selected</span>
                  ) : (
                    selectedRoles.map((r) => (
                      <Badge key={r} variant="accent" className="capitalize">
                        {r === 'super_admin' ? 'Super Admin' : r}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 bg-accent-500/5 border border-accent-500/20 rounded-xl space-y-2 text-xs text-gray-300">
                <span className="font-bold text-accent-300 block">Instant Delivery Notice</span>
                <p className="leading-relaxed text-gray-400">
                  Notifications sent via this console will immediately show in the top header bell for all active users of the selected roles.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Sent Broadcast History Table */}
      <div className="mt-10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-300">
          <History size={18} className="text-accent-400" />
          <span>Recent Broadcast History</span>
        </div>

        {isLoadingHistory ? (
          <TableSkeleton rows={4} columns={5} />
        ) : historyLogs.length === 0 ? (
          <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center text-xs text-gray-500">
            No broadcast notifications have been sent yet.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <DataTable columns={columns} data={historyLogs} />
          </div>
        )}
      </div>
    </ContentWrapper>
  );
}
