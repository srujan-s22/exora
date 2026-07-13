import type { UserRoleType } from './roles';

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  badge?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/**
 * Sidebar navigation configuration per role.
 * Icons reference Lucide icon names for use with lucide-react.
 */
export const NAVIGATION: Record<UserRoleType, NavSection[]> = {
  admin: [
    {
      items: [
        { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Exhibitions', href: '/admin/exhibitions', icon: 'CalendarDays' },
        { label: 'Tickets', href: '/admin/tickets', icon: 'Ticket' },
        { label: 'Rides & Games', href: '/admin/rides', icon: 'Gamepad2' },
        { label: 'Staff', href: '/admin/staff', icon: 'Users' },
      ],
    },
    {
      title: 'Analytics & Controls',
      items: [
        { label: 'Reports', href: '/admin/reports', icon: 'BarChart3' },
        { label: 'Fraud & Alerts', href: '/admin/fraud', icon: 'ShieldAlert' },
        { label: 'Reconciliation', href: '/admin/reconciliation', icon: 'Scale' },
        { label: 'Risk Profiling', href: '/admin/risk', icon: 'ShieldQuestion' },
        { label: 'Audit Logs', href: '/admin/audit-logs', icon: 'ScrollText' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
      ],
    },
  ],

  counter: [
    {
      items: [
        { label: 'Dashboard', href: '/counter', icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Sell Tickets', href: '/counter/sell', icon: 'Ticket' },
        { label: 'Sell Ride Tickets', href: '/counter/rides', icon: 'Gamepad2' },
        { label: 'Sales History', href: '/counter/history', icon: 'History' },
      ],
    },
  ],

  gate: [
    {
      items: [
        { label: 'Dashboard', href: '/gate', icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Scan Tickets', href: '/gate/scan', icon: 'ScanLine' },
        { label: 'Scan Ride Tickets', href: '/ride', icon: 'Gamepad2' },
        { label: 'Scan History', href: '/gate/history', icon: 'History' },
      ],
    },
  ],
};
