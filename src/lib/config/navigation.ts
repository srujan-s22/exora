import type { UserRoleType, UserPermissionKey } from './roles';

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  badge?: string;
  /** If set, only shown when user has this permission */
  requirePermission?: UserPermissionKey;
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
  super_admin: [
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
        { label: 'Notifications', href: '/admin/notifications', icon: 'Bell' },
      ],
    },
    {
      title: 'User Management',
      items: [
        { label: 'Password Resets', href: '/admin/password-resets', icon: 'KeyRound' },
      ],
    },
    {
      title: 'Analytics & Controls',
      items: [
        { label: 'Analytics Console', href: '/admin/analytics', icon: 'LineChart' },
        { label: 'Reports', href: '/admin/reports', icon: 'BarChart3' },
        { label: 'Fraud & Alerts', href: '/admin/fraud', icon: 'ShieldAlert' },
        { label: 'Sales vs Entry Check', href: '/admin/reconciliation', icon: 'Scale' },
        { label: 'Risk Overview', href: '/admin/risk', icon: 'ShieldQuestion' },
        { label: 'Activity Logs', href: '/admin/audit-logs', icon: 'ScrollText' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
      ],
    },
  ],

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
      title: 'User Management',
      items: [
        { label: 'Password Resets', href: '/admin/password-resets', icon: 'KeyRound', requirePermission: 'canResetPasswords' },
      ],
    },
    {
      title: 'Analytics & Controls',
      items: [
        { label: 'Analytics Console', href: '/admin/analytics', icon: 'LineChart' },
        { label: 'Reports', href: '/admin/reports', icon: 'BarChart3' },
        { label: 'Fraud & Alerts', href: '/admin/fraud', icon: 'ShieldAlert' },
        { label: 'Sales vs Entry Check', href: '/admin/reconciliation', icon: 'Scale' },
        { label: 'Risk Overview', href: '/admin/risk', icon: 'ShieldQuestion' },
        { label: 'Activity Logs', href: '/admin/audit-logs', icon: 'ScrollText', requirePermission: 'canViewAuditLogs' },
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
        { label: 'Scan History', href: '/gate/history', icon: 'History' },
      ],
    },
  ],

  ride: [
    {
      items: [
        { label: 'Dashboard', href: '/ride', icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Scan Ride Tickets', href: '/ride', icon: 'Gamepad2' },
        { label: 'Scan History', href: '/ride/history', icon: 'History' },
      ],
    },
  ],
};
