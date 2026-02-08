import type { DomainError } from '@oct/core';

export function errorToHttpStatus(error: DomainError): number {
  const statusMap: Record<string, number> = {
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'INVALID_INPUT': 400,
    'CONFLICT': 409,
    'INTERNAL_ERROR': 500,
  };
  return statusMap[error.code] ?? 500;
}

export function serializeError(error: DomainError): Record<string, unknown> {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
    },
  };
}

export function serializeSuccess<T>(data: T): Record<string, unknown> {
  return {
    ok: true,
    data,
  };
}
