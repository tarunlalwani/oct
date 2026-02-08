import { describe, it, expect } from 'vitest';
import { errorCodeSchema, domainErrorSchema, createError } from './error.js';

describe('Error Schema', () => {
  describe('error codes', () => {
    it('should validate all error codes are in closed set', () => {
      const validCodes = [
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'INVALID_INPUT',
        'CONFLICT',
        'INTERNAL_ERROR',
      ];

      for (const code of validCodes) {
        expect(errorCodeSchema.safeParse(code).success).toBe(true);
      }
    });

    it('should reject unknown error codes', () => {
      expect(errorCodeSchema.safeParse('UNKNOWN_ERROR').success).toBe(false);
      expect(errorCodeSchema.safeParse('BAD_REQUEST').success).toBe(false);
    });
  });

  describe('domain error schema', () => {
    const validError = {
      code: 'NOT_FOUND' as const,
      message: 'Task not found',
      retryable: false,
    };

    it('should validate error with required fields', () => {
      const result = domainErrorSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('should validate error with optional details', () => {
      const result = domainErrorSchema.safeParse({
        ...validError,
        details: { taskId: '123' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject error without code', () => {
      const result = domainErrorSchema.safeParse({
        message: 'Task not found',
        retryable: false,
      });
      expect(result.success).toBe(false);
    });

    it('should reject error without message', () => {
      const result = domainErrorSchema.safeParse({
        code: 'NOT_FOUND',
        retryable: false,
      });
      expect(result.success).toBe(false);
    });

    it('should reject error without retryable', () => {
      const result = domainErrorSchema.safeParse({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createError', () => {
    it('should create error with all required fields', () => {
      const error = createError('NOT_FOUND', 'Task not found', false);
      expect(error).toEqual({
        code: 'NOT_FOUND',
        message: 'Task not found',
        retryable: false,
      });
    });

    it('should create error with details', () => {
      const details = { taskId: '123' };
      const error = createError('NOT_FOUND', 'Task not found', false, details);
      expect(error).toEqual({
        code: 'NOT_FOUND',
        message: 'Task not found',
        retryable: false,
        details,
      });
    });

    it('should default retryable to false', () => {
      const error = createError('NOT_FOUND', 'Task not found');
      expect(error.retryable).toBe(false);
    });

    it('should have UNAUTHORIZED error with retryable=false', () => {
      const error = createError('UNAUTHORIZED', 'Unauthorized', false);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.retryable).toBe(false);
    });

    it('should have FORBIDDEN error with retryable=false', () => {
      const error = createError('FORBIDDEN', 'Forbidden', false);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.retryable).toBe(false);
    });

    it('should have INTERNAL_ERROR error with retryable=true', () => {
      const error = createError('INTERNAL_ERROR', 'Internal error', true);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.retryable).toBe(true);
    });
  });
});
