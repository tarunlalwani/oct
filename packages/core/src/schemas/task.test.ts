import { describe, it, expect } from 'vitest';
import { taskSchema, taskStatusSchema } from './task.js';

describe('Task Schema', () => {
  const validTask = {
    taskId: 'task-123',
    status: 'pending' as const,
    title: 'Test Task',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'user-123',
  };

  describe('valid task', () => {
    it('should accept valid task with all required fields', () => {
      const result = taskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const statuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
      for (const status of statuses) {
        const result = taskStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it('should accept valid description', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        description: 'Task description with markdown **bold**',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null description', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid metadata object', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        metadata: { key: 'value', nested: { foo: 'bar' } },
      });
      expect(result.success).toBe(true);
    });

    it('should accept null metadata', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        metadata: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('title validation', () => {
    it('should accept title with 1 character', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        title: 'A',
      });
      expect(result.success).toBe(true);
    });

    it('should accept title with 256 characters', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        title: 'A'.repeat(256),
      });
      expect(result.success).toBe(true);
    });

    it('should reject title with 0 characters', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        title: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject title with >256 characters', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        title: 'A'.repeat(257),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('datetime validation', () => {
    it('should accept valid ISO-8601 datetime', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid datetime format', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        createdAt: '2024-01-15',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('required fields', () => {
    it('should reject task without taskId', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        taskId: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject task without status', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        status: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject task without title', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        title: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject task without createdAt', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        createdAt: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject task without updatedAt', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        updatedAt: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject task without createdBy', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        createdBy: undefined,
      });
      expect(result.success).toBe(false);
    });
  });
});
