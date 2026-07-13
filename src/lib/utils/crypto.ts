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
 * Generate a SHA-256 hash of a string.
 * Used for creating qrHash for fast ticket lookup.
 */
export function sha256(data: string): string {
  const salt = process.env.QR_HMAC_SECRET || 'exhibitiq-hash-salt';
  return createHmac('sha256', salt).update(data).digest('hex');
}

/**
 * Generate a random hex string of specified byte length.
 */
export function generateRandomToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Generate a unique ticket number.
 * Format: EXH-YYYYMMDD-NNNNN
 */
export function generateTicketNumber(prefix: string, sequence: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const seqStr = String(sequence).padStart(5, '0');
  return `${prefix}-${dateStr}-${seqStr}`;
}

import jwt from 'jsonwebtoken';

/**
 * Generate a unique transaction ID.
 * Format: TXN-YYYYMMDD-NNNNN
 */
export function generateTransactionId(sequence: number): string {
  return generateTicketNumber('TXN', sequence);
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
