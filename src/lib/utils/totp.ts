import crypto from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode a Buffer into an RFC 4648 Base32 string (without padding).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode an RFC 4648 Base32 string into a Buffer.
 */
export function base32Decode(base32Str: string): Buffer {
  const cleaned = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a random Base32 TOTP secret key (20 bytes / 160 bits).
 */
export function generateTotpSecret(bytesCount = 20): string {
  const randomBytes = crypto.randomBytes(bytesCount);
  return base32Encode(randomBytes);
}

/**
 * Helper to derive a 32-byte key Buffer from environment variables.
 */
function getEncryptionKey(): Buffer {
  const rawKey = process.env.TOTP_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!rawKey) {
    throw new Error('Server configuration error: TOTP_ENCRYPTION_KEY is missing.');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypt a plain-text TOTP secret using AES-256-GCM.
 * Output format: "iv_hex:authTag_hex:ciphertext_hex"
 */
export function encryptTotpSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted TOTP secret.
 */
export function decryptTotpSecret(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Construct an otpauth:// URI compatible with Google Authenticator, Authy, 2FAS, etc.
 */
export function generateOtpauthUri(secret: string, staffId: string, issuer = 'EXORA'): string {
  const label = encodeURIComponent(`${issuer}:${staffId}`);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Render an otpauth URI into a Base64 PNG Data URL for display.
 */
export async function generateQrCodeDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Generate HMAC-based One-Time Password (HOTP) per RFC 4226.
 */
export function generateHotp(secretBuffer: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  // Write counter as 64-bit big-endian integer
  let tempCounter = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }

  const hmac = crypto.createHmac('sha1', secretBuffer).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binaryCode % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP code against a secret key per RFC 6238.
 * Supports window drift tolerance (default ±1 step / 30 seconds).
 */
export function verifyTotpCode(secret: string, code: string, window = 1): boolean {
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return false;
  }

  try {
    const secretBuffer = base32Decode(secret);
    const timeStep = 30; // 30-second window
    const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

    for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
      const generatedCode = generateHotp(secretBuffer, currentCounter + errorWindow);
      if (crypto.timingSafeEqual(Buffer.from(generatedCode), Buffer.from(code))) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Generate a set of single-use recovery codes formatted as XXXX-XXXX-XXXX.
 */
export function generateRecoveryCodes(count = 8): string[] {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous charset
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(12);
    let codeStr = '';
    for (let j = 0; j < 12; j++) {
      codeStr += chars[bytes[j] % chars.length];
    }
    // Format into XXXX-XXXX-XXXX
    const formatted = `${codeStr.slice(0, 4)}-${codeStr.slice(4, 8)}-${codeStr.slice(8, 12)}`;
    codes.push(formatted);
  }

  return codes;
}

/**
 * Hash a recovery code using SHA-256 for secure storage.
 * Normalizes user input (strips spaces/hyphens and converts to uppercase).
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verify if a recovery code matches any of the hashed recovery codes.
 * Returns the matching index if valid, or -1 if invalid.
 */
export function verifyRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): { isValid: boolean; matchedIndex: number } {
  if (!inputCode || !hashedCodes || hashedCodes.length === 0) {
    return { isValid: false, matchedIndex: -1 };
  }

  const inputHash = hashRecoveryCode(inputCode);
  const inputBuffer = Buffer.from(inputHash);

  for (let i = 0; i < hashedCodes.length; i++) {
    const storedBuffer = Buffer.from(hashedCodes[i]);
    if (storedBuffer.length === inputBuffer.length && crypto.timingSafeEqual(storedBuffer, inputBuffer)) {
      return { isValid: true, matchedIndex: i };
    }
  }

  return { isValid: false, matchedIndex: -1 };
}
