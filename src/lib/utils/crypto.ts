import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, timingSafeEqual as cryptoTimingSafeEqual } from 'crypto';
import { BCRYPT_SALT_ROUNDS } from './constants';

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plain text password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographic HMAC-SHA256 signature.
 * Used for QR code payload signing.
 */
export function generateHmac(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature.
 */
export function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expected = generateHmac(data, secret);
  // Timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a SHA-256 hash of a string using QR_HMAC_SECRET salt.
 * Used for creating qrHash for fast ticket lookup.
 * Security Note: Throws in production if QR_HMAC_SECRET is unconfigured.
 */
export function sha256(data: string): string {
  const salt = process.env.QR_HMAC_SECRET;
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY CONFIGURATION ERROR: QR_HMAC_SECRET is required for hashing.');
    }
  }
  return createHmac('sha256', salt || 'exora-hash-salt').update(data).digest('hex');
}

/**
 * Generate a random hex string of specified byte length.
 */
export function generateRandomToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Generate a random alphanumeric string of specified length using crypto.randomBytes.
 * Excludes ambiguous characters (0, O, 1, I) for readability.
 */
export function generateRandomCode(length: number = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate a unique, unguessable random ticket number.
 * Format: PREFIX-YYYYMMDD-XXXXXX (e.g., EXH-20260725-8K9F2P, RID-20260725-3M7N4W)
 */
export function generateTicketNumber(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomCode = generateRandomCode(6);
  return `${prefix}-${dateStr}-${randomCode}`;
}

import jwt from 'jsonwebtoken';

/**
 * Generate a unique, unguessable random transaction ID.
 * Format: TXN-YYYYMMDD-XXXXXX or RTX-YYYYMMDD-XXXXXX
 */
export function generateTransactionId(prefix: string = 'TXN'): string {
  return generateTicketNumber(prefix);
}

/**
 * Sign a JWT token.
 */
export function signJwt(payload: object, secret: string, expiresIn: string = '8h'): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

/**
 * Verify a JWT token.
 */
export function verifyJwt(token: string, secret: string): jwt.JwtPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string') {
    throw new Error('Unexpected JWT payload format');
  }
  return decoded;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Use this instead of === for comparing secrets, tokens, etc.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return cryptoTimingSafeEqual(bufA, bufB);
}
