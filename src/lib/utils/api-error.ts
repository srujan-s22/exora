/**
 * Custom error hierarchy for the application.
 * Each error class maps to an HTTP status code and a machine-readable error code.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', 401, message);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('FORBIDDEN', 403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super('NOT_FOUND', 404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', 409, message, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super('RATE_LIMIT_EXCEEDED', 429, message);
    this.name = 'RateLimitError';
  }
}

/**
 * Check if an error is an AppError instance.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
