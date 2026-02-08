import { describe, it, expect } from 'vitest';
import { executionContextSchema, environmentSchema } from './context.js';

describe('ExecutionContext Schema', () => {
  const validContext = {
    actorId: 'user-123',
    workspaceId: 'ws-456',
    permissions: ['task:create', 'task:read'],
    environment: 'local' as const,
  };

  describe('valid context', () => {
    it('should accept valid context with all required fields', () => {
      const result = executionContextSchema.safeParse(validContext);
      expect(result.success).toBe(true);
    });

    it('should accept valid environment values: local, ci, server', () => {
      expect(environmentSchema.safeParse('local').success).toBe(true);
      expect(environmentSchema.safeParse('ci').success).toBe(true);
      expect(environmentSchema.safeParse('server').success).toBe(true);
    });

    it('should accept optional traceId', () => {
      const result = executionContextSchema.safeParse({
        ...validContext,
        traceId: 'trace-123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional metadata', () => {
      const result = executionContextSchema.safeParse({
        ...validContext,
        metadata: { key: 'value' },
      });
      expect(result.success).toBe(true);
    });

    it('should accept null metadata', () => {
      const result = executionContextSchema.safeParse({
        ...validContext,
        metadata: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid context', () => {
    it('should reject context without actorId', () => {
      const result = executionContextSchema.safeParse({
        ...validContext,
        actorId: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject context without workspaceId', () => {
      const result = executionContextSchema.safeParse({
        ...validContext,
        workspaceId: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject context without permissions', () => {
      const result = executionContextSchema.safeParse({
        ...validContext,
        permissions: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject context without environment', () => {
      const result = executionContextSchema.safeParse({
        ...validContext,
        environment: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid environment values', () => {
      expect(environmentSchema.safeParse('invalid').success).toBe(false);
      expect(environmentSchema.safeParse('production').success).toBe(false);
    });

    it('should reject unknown fields (strict schema)', () => {
      const result = executionContextSchema.safeParse({
        ...validContext,
        unknownField: 'value',
      });
      expect(result.success).toBe(false);
    });
  });
});
