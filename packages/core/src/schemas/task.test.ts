import { describe, it, expect } from 'vitest';
import { taskSchema, taskStatusSchema, prioritySchema } from './task.js';

describe('Task Schema', () => {
  const validTask = {
    taskId: 'task-123',
    projectId: 'proj-123',
    title: 'Test Task',
    type: 'feature',
    ownerId: 'emp-456',
    context: null,
    goal: null,
    deliverable: null,
    status: 'backlog',
    priority: 'P2',
    dependencies: [],
    blockedBy: [],
    approval: null,
    metadata: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  describe('valid task', () => {
    it('should accept valid task with all required fields', () => {
      const result = taskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const statuses = ['backlog', 'todo', 'in_progress', 'blocked', 'in_review', 'done'];
      for (const status of statuses) {
        const result = taskStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it('should accept all valid priority values', () => {
      const priorities = ['P0', 'P1', 'P2', 'P3'];
      for (const priority of priorities) {
        const result = prioritySchema.safeParse(priority);
        expect(result.success).toBe(true);
      }
    });

    it('should accept valid context', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        context: 'Task context with details',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid goal', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        goal: 'Task goal description',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid deliverable', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        deliverable: 'Expected deliverable',
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

    it('should accept task with dependencies', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        dependencies: ['task-1', 'task-2'],
        blockedBy: ['task-1'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with approval', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        status: 'done',
        approval: {
          state: 'approved',
          approverId: 'emp-123',
          approvedAt: '2024-01-02T00:00:00.000Z',
          policy: 'manual-review',
        },
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

    it('should reject task without projectId', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        projectId: undefined,
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

    it('should reject task without type', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        type: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject task without ownerId', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        ownerId: undefined,
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

    it('should reject task without priority', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        priority: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject task without dependencies', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        dependencies: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should reject task without blockedBy', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        blockedBy: undefined,
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
  });
});
