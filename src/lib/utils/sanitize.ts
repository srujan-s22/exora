/**
 * Input sanitization utilities for security-sensitive operations.
 */

/**
 * Escape special regex characters in user-supplied strings.
 * Must be applied before passing user input to MongoDB $regex operators
 * to prevent ReDoS (Regular Expression Denial of Service) attacks.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize an error message for client-facing responses.
 * In production, strips internal details and returns a generic message.
 * In development, passes through the original message for debugging.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV !== 'production') {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
  }
  return fallback;
}
