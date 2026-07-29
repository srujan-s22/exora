import { logger } from '../utils/logger';

/**
 * Validates critical environment variables required for operations.
 * Logs structured alerts and blocks execution in production if variables are undefined.
 * Security Note: Ensures production builds refuse startup if placeholder/default secret values remain.
 */
export function validateEnv() {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'QR_HMAC_SECRET', 'SUPER_ADMIN_SECRET', 'BOOTSTRAP_SECRET'];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    const errorMsg = `CRITICAL CONFIGURATION ERROR: The following required environment variables are missing: ${missing.join(', ')}`;
    logger.error(errorMsg, null, { missing });

    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    }
  }

  // Placeholder secret check for production safety
  if (process.env.NODE_ENV === 'production') {
    const defaultPlaceholders = ['change-this', 'your-super-secret', 'your-separate-qr', 'dev-qr-secret'];
    const secretsToCheck = ['JWT_SECRET', 'QR_HMAC_SECRET', 'SUPER_ADMIN_SECRET', 'BOOTSTRAP_SECRET'];

    for (const secretKey of secretsToCheck) {
      const val = process.env[secretKey] || '';
      if (defaultPlaceholders.some((ph) => val.includes(ph))) {
        const placeholderError = `SECURITY RISK: Environment variable ${secretKey} contains an unsecure placeholder string in production.`;
        logger.error(placeholderError);
        throw new Error(placeholderError);
      }
    }
  }
}
