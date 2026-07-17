'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { NAVIGATION } from '@/lib/config/navigation';
import { Separator } from '../ui/separator';

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  // If no user (e.g. at login), hide sidebar
  if (!user) return null;

  const sections = NAVIGATION[user.role] || [];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-800 bg-gray-900 lg:flex lg:flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 gap-3">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-gray-800 bg-gray-950">
          <img src="/logo1.png" alt="EXORA Logo" className="h-full w-full object-cover" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-50 bg-clip-text">
          EXORA
        </span>
      </div>

      <Separator />

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        {sections.map((section, idx) => {
          const filteredItems = section.items.filter((item) => {
            if (item.requirePermission) {
              return hasPermission(item.requirePermission);
            }
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-2">
              {section.title && (
                <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {section.title}
                </h4>
              )}
              <ul className="space-y-1">
                {filteredItems.map((item) => {
                  const isActive = pathname === item.href;
                  const IconComponent = (Icons as any)[item.icon] || Icons.HelpCircle;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group select-none
                          ${
                            isActive
                              ? 'bg-accent-500/10 text-accent-300 border-l-2 border-accent-500 font-semibold pl-3.5 shadow-sm'
                              : 'text-gray-400 hover:bg-gray-850 hover:text-gray-100 border-l-2 border-transparent'
                          }
                        `}
                      >
                        <IconComponent
                          size={18}
                          className={`shrink-0 transition-colors ${
                            isActive ? 'text-accent-400' : 'text-gray-500 group-hover:text-gray-300'
                          }`}
                        />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto flex h-5 items-center justify-center rounded-full bg-accent-500/20 px-2 text-[10px] font-bold text-accent-300">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Footer Profile info */}
      <div className="p-4 border-t border-gray-800/40 bg-gray-900/30 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-800 border border-gray-700/60 flex items-center justify-center text-xs font-bold text-gray-200 uppercase">
          {user.name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-150 truncate leading-none mb-1">{user.name}</p>
          <span className="inline-flex items-center rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-bold text-accent-300 uppercase tracking-wider">
            {user.role}
          </span>
        </div>
      </div>
    </aside>
  );
}
