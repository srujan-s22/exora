export const UserRole = {
  ADMIN: 'admin',
  COUNTER: 'counter',
  GATE: 'gate',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const ROLE_HIERARCHY: Record<UserRoleType, number> = {
  admin: 3,
  counter: 1,
  gate: 1,
};

/**
 * Permission matrix defining what each role can access.
 * Used by both edge middleware (route protection) and API middleware (action authorization).
 */
export const PERMISSIONS = {
  // Exhibition management
  'exhibition.create': ['admin'],
  'exhibition.update': ['admin'],
  'exhibition.delete': ['admin'],
  'exhibition.list': ['admin', 'counter', 'gate'],
  'exhibition.read': ['admin', 'counter', 'gate'],

  // Staff management
  'staff.create': ['admin'],
  'staff.update': ['admin'],
  'staff.delete': ['admin'],
  'staff.list': ['admin'],
  'staff.read': ['admin'],

  // Ticket operations
  'ticket.create': ['admin', 'counter'],
  'ticket.validate': ['admin', 'gate'],
  'ticket.read': ['admin', 'counter', 'gate'],
  'ticket.cancel': ['admin'],
  'ticket.list': ['admin', 'counter'],

  // Sales
  'sale.create': ['admin', 'counter'],
  'sale.read': ['admin', 'counter'],
  'sale.list': ['admin'],
  'sale.stats': ['admin'],

  // Audit logs
  'audit.read': ['admin'],
  'audit.list': ['admin'],

  // Dashboard
  'dashboard.admin': ['admin'],
  'dashboard.counter': ['admin', 'counter'],
  'dashboard.gate': ['admin', 'gate'],

  // Settings
  'settings.read': ['admin'],
  'settings.update': ['admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Route-to-role mapping for edge middleware.
 * Maps route prefixes to the roles allowed to access them.
 */
export const ROUTE_ROLE_MAP: Record<string, UserRoleType[]> = {
  '/admin': ['admin'],
  '/counter': ['admin', 'counter'],
  '/gate': ['admin', 'gate'],
  '/ride': ['admin', 'gate'],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRoleType, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}
