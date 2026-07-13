import { logger } from '../utils/logger';

/**
 * Validates critical environment variables required for operations.
 * Logs structured alerts and blocks execution in production if variables are undefined.
 */
export function validateEnv() {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'QR_HMAC_SECRET'];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    const errorMsg = `CRITICAL CONFIGURATION ERROR: The following required environment variables are missing: ${missing.join(', ')}`;
    logger.error(errorMsg, null, { missing });

    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    }
  }
}
