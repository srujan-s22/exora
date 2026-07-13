/**
 * QR code generation utilities.
 * Uses the 'qrcode' library for server-side QR generation.
 */
import QRCode from 'qrcode';
import { generateHmac } from './crypto';

interface QrPayloadData {
  ticketId: string;
  exhibitionId: string;
  timestamp: number;
}

/**
 * Create a signed QR payload string.
 * Format: ticketId:exhibitionId:timestamp:hmacSignature
 */
export function createQrPayload(data: QrPayloadData, secret: string): string {
  const payload = `${data.ticketId}:${data.exhibitionId}:${data.timestamp}`;
  const signature = generateHmac(payload, secret);
  return `${payload}:${signature}`;
}

/**
 * Parse and verify a QR payload string.
 * Returns the parsed data if valid, null if invalid.
 */
export function parseQrPayload(
  raw: string,
  secret: string
): QrPayloadData | null {
  const parts = raw.split(':');
  if (parts.length !== 4) return null;

  const [ticketId, exhibitionId, timestampStr, signature] = parts;
  const payload = `${ticketId}:${exhibitionId}:${timestampStr}`;
  const expectedSignature = generateHmac(payload, secret);

  // Timing-safe comparison
  if (expectedSignature.length !== signature.length) return null;
  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (result !== 0) return null;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  return { ticketId, exhibitionId, timestamp };
}

/**
 * Generate a QR code as a data URL (base64 PNG).
 * Used for displaying QR codes in the browser.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#111118',
      light: '#ffffff',
    },
  });
}
