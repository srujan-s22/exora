export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COUNTER: 'counter',
  GATE: 'gate',
  RIDE: 'ride',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const ALL_ROLES: UserRoleType[] = ['super_admin', 'admin', 'counter', 'gate', 'ride'];

export const ROLE_HIERARCHY: Record<UserRoleType, number> = {
  super_admin: 10,
  admin: 5,
  counter: 1,
  gate: 1,
  ride: 1,
};

/**
 * Roles that each role is allowed to create.
 * super_admin can create everything.
 * admin (with canCreateUsers) can create counter, gate, ride by default.
 * admin (with canCreateAdmins) can also create admins.
 * Staff roles cannot create anyone.
 */
export const CREATABLE_ROLES: Record<UserRoleType, UserRoleType[]> = {
  super_admin: ['super_admin', 'admin', 'counter', 'gate', 'ride'],
  admin: ['counter', 'gate', 'ride'], // base set; canCreateAdmins adds 'admin'
  counter: [],
  gate: [],
  ride: [],
};

/**
 * User-level permission keys.
 * These are stored on each admin user and control fine-grained access.
 */
export const USER_PERMISSION_KEYS = [
  'canCreateUsers',
  'canResetPasswords',
  'canViewAuditLogs',
  'canManageStaff',
  'canApproveResets',
  'canCreateAdmins',
] as const;

export type UserPermissionKey = (typeof USER_PERMISSION_KEYS)[number];

/** Default permissions for newly created admins (all off). */
export const DEFAULT_ADMIN_PERMISSIONS: Record<UserPermissionKey, boolean> = {
  canCreateUsers: false,
  canResetPasswords: false,
  canViewAuditLogs: false,
  canManageStaff: false,
  canApproveResets: false,
  canCreateAdmins: false,
};

/** Super admins always have all permissions. */
export const SUPER_ADMIN_PERMISSIONS: Record<UserPermissionKey, boolean> = {
  canCreateUsers: true,
  canResetPasswords: true,
  canViewAuditLogs: true,
  canManageStaff: true,
  canApproveResets: true,
  canCreateAdmins: true,
};

/**
 * Permission matrix defining what each role can access.
 * Used by both edge middleware (route protection) and API middleware (action authorization).
 */
export const PERMISSIONS = {
  // Exhibition management
  'exhibition.create': ['super_admin', 'admin'],
  'exhibition.update': ['super_admin', 'admin'],
  'exhibition.delete': ['super_admin', 'admin'],
  'exhibition.list': ['super_admin', 'admin', 'counter', 'gate', 'ride'],
  'exhibition.read': ['super_admin', 'admin', 'counter', 'gate', 'ride'],

  // Staff management
  'staff.create': ['super_admin', 'admin'],
  'staff.update': ['super_admin', 'admin'],
  'staff.delete': ['super_admin', 'admin'],
  'staff.list': ['super_admin', 'admin'],
  'staff.read': ['super_admin', 'admin'],

  // Ticket operations
  'ticket.create': ['super_admin', 'admin', 'counter'],
  'ticket.validate': ['super_admin', 'admin', 'gate'],
  'ticket.read': ['super_admin', 'admin', 'counter', 'gate'],
  'ticket.cancel': ['super_admin', 'admin'],
  'ticket.list': ['super_admin', 'admin', 'counter'],

  // Sales
  'sale.create': ['super_admin', 'admin', 'counter'],
  'sale.read': ['super_admin', 'admin', 'counter'],
  'sale.list': ['super_admin', 'admin'],
  'sale.stats': ['super_admin', 'admin'],

  // Audit logs
  'audit.read': ['super_admin', 'admin'],
  'audit.list': ['super_admin', 'admin'],

  // Dashboard
  'dashboard.admin': ['super_admin', 'admin'],
  'dashboard.counter': ['super_admin', 'admin', 'counter'],
  'dashboard.gate': ['super_admin', 'admin', 'gate'],

  // Settings
  'settings.read': ['super_admin', 'admin'],
  'settings.update': ['super_admin', 'admin'],

  // User management (new)
  'user.create': ['super_admin', 'admin'],
  'user.manage_permissions': ['super_admin'],
  'user.approve_reset': ['super_admin'],

  // Password resets (new)
  'password_reset.create': ['super_admin', 'admin'],
  'password_reset.approve': ['super_admin'],
  'password_reset.list': ['super_admin', 'admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Route-to-role mapping for edge middleware.
 * Maps route prefixes to the roles allowed to access them.
 */
export const ROUTE_ROLE_MAP: Record<string, UserRoleType[]> = {
  '/admin': ['super_admin', 'admin'],
  '/counter': ['super_admin', 'admin', 'counter'],
  '/gate': ['super_admin', 'admin', 'gate'],
  '/ride': ['super_admin', 'admin', 'ride'],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRoleType, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}
