import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_INPUT',
  'CONFLICT',
  'INTERNAL_ERROR',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const domainErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  details: z.record(z.any()).optional(),
  retryable: z.boolean(),
});

export type DomainError = z.infer<typeof domainErrorSchema>;

export function createError(
  code: ErrorCode,
  message: string,
  retryable: boolean = false,
  details?: Record<string, unknown>
): DomainError {
  return {
    code,
    message,
    retryable,
    details,
  };
}
