'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Shield, User, Globe } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Breadcrumbs } from './breadcrumbs';
import { Dropdown, type DropdownItem } from '../ui/dropdown';
import { Separator } from '../ui/separator';

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { addToast } = useToast();

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

        {/* Mute Bell Notification Icon */}
        <button 
          onClick={() => addToast({ type: 'info', title: 'Notifications', message: 'No new notifications at this time.' })}
          className="relative rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-900 p-2 transition-colors cursor-pointer"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-500" />
        </button>

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
