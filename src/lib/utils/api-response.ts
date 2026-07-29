import type { ApiSuccessResponse, ApiErrorResponse, PaginationMeta, PaginatedResponse } from '@/types/api.types';

/**
 * Create a standardized success response.
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };
  return Response.json(body, { status: 200 });
}

/**
 * Create a standardized success response with custom status.
 */
export function createdResponse<T>(data: T): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  return Response.json(body, { status: 201 });
}

/**
 * Create a standardized paginated response.
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta
): Response {
  const body: PaginatedResponse<T> = {
    success: true,
    data,
    meta: { pagination },
  };
  return Response.json(body, { status: 200 });
}

/**
 * Create a standardized error response.
 * Security Note: Ensures uniform error format across all API routes to avoid exposing raw stack traces,
 * database query internals, or inconsistent error shapes that assist fingerprinting.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  return Response.json(body, { status });
}
