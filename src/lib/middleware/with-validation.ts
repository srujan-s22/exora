import type { NextRequest } from 'next/server';
import type { ZodSchema } from 'zod';
import { errorResponse } from '@/lib/utils/api-response';

/**
 * API middleware that validates the request body against a Zod schema.
 * Returns 400 with detailed validation errors on failure.
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest & { validatedBody: T }, context?: unknown) => Promise<Response>
) {
  return async (req: NextRequest, context?: unknown): Promise<Response> => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        const errors = result.error.flatten();
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          400,
          {
            fieldErrors: errors.fieldErrors,
            formErrors: errors.formErrors,
          }
        );
      }

      // Attach validated body to request
      const validatedReq = req as NextRequest & { validatedBody: T };
      validatedReq.validatedBody = result.data;

      return handler(validatedReq, context);
    } catch {
      return errorResponse('INVALID_BODY', 'Request body must be valid JSON', 400);
    }
  };
}
