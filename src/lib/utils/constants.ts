/**
 * Application-wide constants.
 */

export const APP_NAME = 'ExhibitIQ';
export const APP_DESCRIPTION = 'Premium Exhibition Management Platform';

// ── Authentication ──
export const AUTH_COOKIE_NAME = 'exhibitiq-token';
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
  admin: 'ADM',
  counter: 'CTR',
  gate: 'GTE',
} as const;

// ── Exhibition Statuses ──
export const EXHIBITION_STATUSES = ['draft', 'upcoming', 'active', 'paused', 'completed', 'closed', 'archived'] as const;
export type ExhibitionStatus = (typeof EXHIBITION_STATUSES)[number];

// ── Ticket Statuses ──
export const TICKET_STATUSES = ['valid', 'used', 'cancelled', 'expired'] as const;
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
  'user.password_change',
  'exhibition.create',
  'exhibition.update',
  'exhibition.status_change',
  'ticket.create',
  'ticket.cancel',
  'ticket.scan',
  'ticket.scan_rejected',
  'sale.create',
  'settings.update',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ── Audit Target Types ──
export const AUDIT_TARGET_TYPES = ['user', 'exhibition', 'ticket', 'sale', 'settings'] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];
