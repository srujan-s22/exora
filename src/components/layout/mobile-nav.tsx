'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { NAVIGATION } from '@/lib/config/navigation';
import { Drawer } from '../ui/drawer';
import { Separator } from '../ui/separator';

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  if (!user) return null;

  const sections = NAVIGATION[user.role] || [];

  return (
    <>
      <div className="lg:hidden flex h-16 w-full items-center justify-between border-b border-gray-800 bg-gray-950 px-5 sticky top-0 z-40 shrink-0">
        {/* Brand Logo Link */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-gray-800 bg-gray-950">
            <img src="/logo1.png" alt="EXORA Logo" className="h-full w-full object-cover" />
          </div>
          <span className="text-base font-bold tracking-tight text-gray-50">
            EXORA
          </span>
        </div>

        {/* Hamburger Toggle button */}
        <button
          onClick={() => setOpen(true)}
          className="rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-900 p-2 transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Icons.Menu size={20} />
        </button>
      </div>

      {/* Sliding Navigation drawer */}
      <Drawer open={open} onClose={() => setOpen(false)} placement="left" title="Menu" size="sm">
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-6">
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
                    <h4 className="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
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
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors select-none
                              ${
                                isActive
                                  ? 'bg-accent-500/10 text-accent-300 border-l-2 border-accent-500'
                                  : 'text-gray-400 hover:bg-gray-850 hover:text-gray-100 border-l-2 border-transparent'
                              }
                            `}
                          >
                            <IconComponent
                              size={16}
                              className={isActive ? 'text-accent-400' : 'text-gray-500'}
                            />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-800/40 mt-6">
            <div className="flex items-center gap-3 py-2 px-3 bg-gray-950/40 rounded-lg">
              <div className="h-8 w-8 rounded-full bg-accent-500/20 text-accent-300 font-bold border border-accent-600/30 flex items-center justify-center text-xs uppercase select-none">
                {user.name.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-150 truncate leading-none mb-1">{user.name}</p>
                <span className="inline-flex items-center rounded-full bg-accent-500/10 px-2 py-0.5 text-[9px] font-bold text-accent-300 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
