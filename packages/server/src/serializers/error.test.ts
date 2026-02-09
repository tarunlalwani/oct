import { describe, it, expect } from 'vitest';
import { errorToHttpStatus, serializeError, serializeSuccess } from './error.js';
import type { DomainError } from '@oct/core';

describe('Error Serializers', () => {
  describe('errorToHttpStatus', () => {
    it('should map UNAUTHORIZED to 401', () => {
      const error: DomainError = { code: 'UNAUTHORIZED', message: 'Unauthorized', retryable: false };
      expect(errorToHttpStatus(error)).toBe(401);
    });

    it('should map FORBIDDEN to 403', () => {
      const error: DomainError = { code: 'FORBIDDEN', message: 'Forbidden', retryable: false };
      expect(errorToHttpStatus(error)).toBe(403);
    });

    it('should map NOT_FOUND to 404', () => {
      const error: DomainError = { code: 'NOT_FOUND', message: 'Not found', retryable: false };
      expect(errorToHttpStatus(error)).toBe(404);
    });

    it('should map INVALID_INPUT to 400', () => {
      const error: DomainError = { code: 'INVALID_INPUT', message: 'Invalid input', retryable: false };
      expect(errorToHttpStatus(error)).toBe(400);
    });

    it('should map CONFLICT to 409', () => {
      const error: DomainError = { code: 'CONFLICT', message: 'Conflict', retryable: false };
      expect(errorToHttpStatus(error)).toBe(409);
    });

    it('should map INTERNAL_ERROR to 500', () => {
      const error: DomainError = { code: 'INTERNAL_ERROR', message: 'Internal error', retryable: true };
      expect(errorToHttpStatus(error)).toBe(500);
    });

    it('should return 500 for unknown error codes', () => {
      const error = { code: 'UNKNOWN', message: 'Unknown', retryable: false } as unknown as DomainError;
      expect(errorToHttpStatus(error)).toBe(500);
    });
  });

  describe('serializeError', () => {
    it('should return {ok: false, error: ...}', () => {
      const error: DomainError = {
        code: 'NOT_FOUND',
        message: 'Task not found',
        retryable: false,
      };

      const result = serializeError(error);

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found',
          retryable: false,
        },
      });
    });

    it('should include details when present', () => {
      const error: DomainError = {
        code: 'INVALID_INPUT',
        message: 'Invalid input',
        retryable: false,
        details: { field: 'title' },
      };

      const result = serializeError(error) as { ok: boolean; error: { details: Record<string, unknown> } };

      expect(result.error.details).toEqual({ field: 'title' });
    });

    it('should have exactly two top-level keys', () => {
      const error: DomainError = {
        code: 'NOT_FOUND',
        message: 'Task not found',
        retryable: false,
      };

      const result = serializeError(error);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('error');
    });
  });

  describe('serializeSuccess', () => {
    it('should return {ok: true, data: ...}', () => {
      const data = { task: { taskId: '123', title: 'Test' } };

      const result = serializeSuccess(data);

      expect(result).toEqual({
        ok: true,
        data: { task: { taskId: '123', title: 'Test' } },
      });
    });

    it('should have exactly two top-level keys', () => {
      const data = { message: 'Hello' };

      const result = serializeSuccess(data);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('data');
    });
  });
});
