'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Shield, User, Globe, CheckCheck, Megaphone, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Breadcrumbs } from './breadcrumbs';
import { Dropdown, type DropdownItem } from '../ui/dropdown';
import { Separator } from '../ui/separator';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'alert' | 'system' | 'info';
  isRead: boolean;
  createdAt: string;
  sender?: { name: string; role: string };
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMarkingRead, setIsMarkingRead] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=15');
      if (!res.ok) return;
      const body = await res.json();
      if (body.success) {
        setNotifications(body.data.notifications || []);
        setUnreadCount(body.data.unreadCount || 0);
      }
    } catch {
      // Silent fail on polling
    }
  }, []);

  React.useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 30 seconds for new notifications
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  // Close popover when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setIsMarkingRead(true);
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        addToast({
          type: 'success',
          title: 'Notifications updated',
          message: 'All notifications marked as read.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not mark notifications as read.',
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleMarkSingleRead = async (notificationId: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  };

  if (!user) return null;

  const handleProfileSelect = async (value: string) => {
    if (value === 'profile') {
      router.push('/admin/settings');
    } else if (value === 'logout') {
      try {
        await logout();
        addToast({
          type: 'info',
          title: 'Signed out successfully',
          message: 'See you next time!',
        });
        router.push('/login');
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Sign out failed',
          message: 'An error occurred during logout.',
        });
      }
    }
  };

  const menuItems: DropdownItem[] = [
    { label: 'My Profile', value: 'profile', icon: <User size={15} /> },
    { label: 'Role Context', value: 'role', icon: <Shield size={15} />, disabled: true },
    { label: 'Sign Out', value: 'logout', icon: <LogOut size={15} />, danger: true },
  ];

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-800 bg-gray-950/80 px-6 backdrop-blur-md shrink-0">
      {/* Breadcrumbs (Left) */}
      <div className="flex items-center gap-3">
        <Breadcrumbs />
      </div>

      {/* Action Controls (Right) */}
      <div className="flex items-center gap-4">
        {/* Exhibition Context Identifier */}
        {user.role !== 'admin' && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs font-medium text-gray-400 select-none">
            <Globe size={13} className="text-accent-400" />
            <span>Scope: Assigned Exh.</span>
          </div>
        )}

        {/* Bell Notification Popover Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-900 p-2 transition-colors cursor-pointer focus:outline-none"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {/* NOTIFICATION DOT: Only rendered if unreadCount > 0 */}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-gray-800 bg-gray-900 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px] animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="p-3.5 border-b border-gray-800 flex items-center justify-between bg-gray-950/60">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-accent-400" />
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-500/20 text-accent-300 border border-accent-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={isMarkingRead}
                    className="text-[11px] font-semibold text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto divide-y divide-gray-850 flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 flex flex-col items-center">
                    <Bell size={24} className="text-gray-700 mb-2" />
                    <span>No notifications at this time.</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkSingleRead(n.id, n.isRead)}
                      className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start ${
                        n.isRead ? 'bg-transparent hover:bg-gray-850/40' : 'bg-accent-500/5 hover:bg-accent-500/10'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'alert' ? (
                          <div className="p-1.5 bg-red-500/10 text-red-400 rounded-md border border-red-500/20">
                            <AlertTriangle size={14} />
                          </div>
                        ) : n.type === 'announcement' ? (
                          <div className="p-1.5 bg-accent-500/10 text-accent-400 rounded-md border border-accent-500/20">
                            <Megaphone size={14} />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">
                            <Info size={14} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs font-semibold truncate ${n.isRead ? 'text-gray-300' : 'text-gray-100 font-bold'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-gray-500 shrink-0">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                        {n.sender && (
                          <span className="text-[10px] text-gray-500 mt-1.5 block">From: {n.sender.name}</span>
                        )}
                      </div>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-accent-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Profile Dropdown selection */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-accent-500/20 focus:ring-offset-gray-950 rounded-lg p-1 hover:bg-gray-900 transition-colors">
              <div className="h-8 w-8 rounded-md bg-accent-500/20 text-accent-300 font-bold border border-accent-600/30 flex items-center justify-center text-xs uppercase leading-none">
                {user.name.slice(0, 2)}
              </div>
              <span className="hidden md:block text-sm font-semibold text-gray-200">{user.name}</span>
              <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" strokeWidth="2.5" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          }
          items={menuItems}
          onSelect={handleProfileSelect}
        />
      </div>
    </header>
  );
}
