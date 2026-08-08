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
  'canCreateExhibitions',
  'canManageExhibitions',
  'canApproveTicketCancellation',
  'canApproveEntryTicketCancellation',
  'canApproveRideTicketCancellation',
  'canManageSessions',
  // Counter operation permissions
  'canSellEntryTickets',
  'canViewEntrySales',
  'canReprintEntryTickets',
  'canCancelEntryTickets',
  'canSellRideTickets',
  'canViewRideSales',
  'canReprintRideTickets',
  'canCancelRideTickets',
] as const;

export type UserPermissionKey = (typeof USER_PERMISSION_KEYS)[number];

/** Default permissions for newly created admins (all off for admin perms, all true for counter ops). */
export const DEFAULT_ADMIN_PERMISSIONS: Record<UserPermissionKey, boolean> = {
  canCreateUsers: false,
  canResetPasswords: false,
  canViewAuditLogs: false,
  canManageStaff: false,
  canApproveResets: false,
  canCreateAdmins: false,
  canCreateExhibitions: false,
  canManageExhibitions: false,
  canApproveTicketCancellation: false,
  canApproveEntryTicketCancellation: false,
  canApproveRideTicketCancellation: false,
  canManageSessions: false,
  // Admins inherently bypass counter permission checks via role, but set true for completeness
  canSellEntryTickets: true,
  canViewEntrySales: true,
  canReprintEntryTickets: true,
  canCancelEntryTickets: true,
  canSellRideTickets: true,
  canViewRideSales: true,
  canReprintRideTickets: true,
  canCancelRideTickets: true,
};

/** Super admins always have all permissions. */
export const SUPER_ADMIN_PERMISSIONS: Record<UserPermissionKey, boolean> = {
  canCreateUsers: true,
  canResetPasswords: true,
  canViewAuditLogs: true,
  canManageStaff: true,
  canApproveResets: true,
  canCreateAdmins: true,
  canCreateExhibitions: true,
  canManageExhibitions: true,
  canApproveTicketCancellation: true,
  canApproveEntryTicketCancellation: true,
  canApproveRideTicketCancellation: true,
  canManageSessions: true,
  canSellEntryTickets: true,
  canViewEntrySales: true,
  canReprintEntryTickets: true,
  canCancelEntryTickets: true,
  canSellRideTickets: true,
  canViewRideSales: true,
  canReprintRideTickets: true,
  canCancelRideTickets: true,
};

/**
 * Default permissions for newly created counter staff (all counter ops enabled).
 * Existing counter users in MongoDB will get these defaults via schema defaults,
 * preserving backward compatibility.
 */
export const DEFAULT_COUNTER_PERMISSIONS: Record<UserPermissionKey, boolean> = {
  // Admin permissions are irrelevant for counter staff
  canCreateUsers: false,
  canResetPasswords: false,
  canViewAuditLogs: false,
  canManageStaff: false,
  canApproveResets: false,
  canCreateAdmins: false,
  canCreateExhibitions: false,
  canManageExhibitions: false,
  canApproveTicketCancellation: false,
  canApproveEntryTicketCancellation: false,
  canApproveRideTicketCancellation: false,
  canManageSessions: false,
  // Counter operation permissions — all enabled by default
  canSellEntryTickets: true,
  canViewEntrySales: true,
  canReprintEntryTickets: true,
  canCancelEntryTickets: true,
  canSellRideTickets: true,
  canViewRideSales: true,
  canReprintRideTickets: true,
  canCancelRideTickets: true,
};

/**
 * Resolve effective user permissions for a given role and stored permission map.
 */
export function resolvePermissions(role: string, storedPermissions?: Record<string, boolean>): Record<UserPermissionKey, boolean> {
  if (role === 'super_admin') {
    return { ...SUPER_ADMIN_PERMISSIONS };
  }
  if (role === 'admin' && storedPermissions) {
    return {
      ...DEFAULT_ADMIN_PERMISSIONS,
      ...storedPermissions,
    } as Record<UserPermissionKey, boolean>;
  }
  if (role === 'counter') {
    return {
      ...DEFAULT_COUNTER_PERMISSIONS,
      ...(storedPermissions || {}),
    } as Record<UserPermissionKey, boolean>;
  }
  return { ...DEFAULT_ADMIN_PERMISSIONS };
}

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
  'settings.update': ['super_admin'],

  // User management (new)
  'user.create': ['super_admin', 'admin'],
  'user.manage_permissions': ['super_admin'],
  'user.approve_reset': ['super_admin'],

  // Password resets (new)
  'password_reset.create': ['super_admin', 'admin'],
  'password_reset.approve': ['super_admin'],
  'password_reset.list': ['super_admin', 'admin'],

  // Cancellation requests
  'cancellation_request.create': ['super_admin', 'admin', 'counter'],
  'cancellation_request.approve': ['super_admin', 'admin'],
  'cancellation_request.reject': ['super_admin', 'admin'],
  'cancellation_request.list': ['super_admin', 'admin'],

  // Session management
  'session.read': ['super_admin', 'admin', 'counter', 'gate', 'ride'],
  'session.revoke': ['super_admin', 'admin', 'counter', 'gate', 'ride'],
  'session.manage_all': ['super_admin', 'admin'],
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
