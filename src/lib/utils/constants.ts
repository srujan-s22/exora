/**
 * Application-wide constants.
 */

export const APP_NAME = 'EXORA';
export const APP_DESCRIPTION = 'Premium Exhibition Management Platform';

// ── Authentication ──
export const AUTH_COOKIE_NAME = 'exora-token';
export const AUTH_TOKEN_EXPIRY = '8h';
export const BCRYPT_SALT_ROUNDS = 12;

// ── Pagination ──
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ── Ticket ──
export const TICKET_NUMBER_PREFIX = 'EXH';
export const TRANSACTION_PREFIX = 'TXN';
export const MAX_SCANS_PER_TICKET = 1;

// ── Staff ID Prefixes ──
export const STAFF_ID_PREFIXES = {
  super_admin: 'SUA',
  admin: 'ADM',
  counter: 'CTR',
  gate: 'GTE',
  ride: 'RDE',
} as const;

// ── Exhibition Statuses ──
export const EXHIBITION_STATUSES = ['draft', 'upcoming', 'active', 'paused', 'completed', 'closed', 'archived'] as const;
export type ExhibitionStatus = (typeof EXHIBITION_STATUSES)[number];

// ── Ticket Statuses ──
export const TICKET_STATUSES = ['valid', 'partially_used', 'used', 'cancelled', 'expired'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// ── Payment Methods ──
export const PAYMENT_METHODS = ['cash', 'upi', 'free'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ── Scan Results ──
export const SCAN_RESULTS = [
  'admitted',
  'rejected_invalid',
  'rejected_used',
  'rejected_expired',
  'rejected_wrong_exhibition',
  'rejected_unknown',
] as const;
export type ScanResult = (typeof SCAN_RESULTS)[number];

// ── Audit Actions ──
export const AUDIT_ACTIONS = [
  'user.login',
  'user.logout',
  'user.login_failed',
  'user.create',
  'user.update',
  'user.deactivate',
  'user.activate',
  'user.password_change',
  'user.bootstrap_created',
  'user.permissions_changed',
  'exhibition.create',
  'exhibition.update',
  'exhibition.status_change',
  'exhibition.pause',
  'exhibition.resume',
  'exhibition.end',
  'exhibition.extend',
  'ticket.create',
  'ticket.cancel',
  'ticket.scan',
  'ticket.scan_rejected',
  'sale.create',
  'settings.update',
  'password_reset.requested',
  'password_reset.approved',
  'password_reset.rejected',
  'password_reset.completed',
  'cancellation_request.create',
  'cancellation_request.approve',
  'cancellation_request.reject',
  'transaction.cancelled',
  'user.mfa_enabled',
  'user.mfa_disabled',
  'user.mfa_login_success',
  'user.mfa_login_failed',
  'user.mfa_recovery_login_success',
  'user.mfa_recovery_failed',
  'user.mfa_recovery_codes_regenerated',
  'user.mfa_enable_failed',
  'user.mfa_disable_failed',
  'session.created',
  'session.revoked',
  'session.revoked_all',
  'session.logout_other_devices',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ── Audit Target Types ──
export const AUDIT_TARGET_TYPES = ['user', 'exhibition', 'ticket', 'sale', 'ride_sale', 'settings', 'password_reset', 'cancellation_request', 'session'] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];
