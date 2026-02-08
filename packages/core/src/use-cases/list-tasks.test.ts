import { describe, it, expect, beforeEach } from 'vitest';
import { listTasksUseCase } from './list-tasks.js';
import { InMemoryTaskRepository } from '../test-utils/in-memory-repository.js';
import { createTask } from '../domain/task.js';
import type { ExecutionContext } from '../schemas/context.js';

describe('ListTasks Use Case', () => {
  let repository: InMemoryTaskRepository;
  let validContext: ExecutionContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should return list of tasks', async () => {
      // Seed with some tasks
      const tasks = [
        createTask({ taskId: 'task-1', title: 'Task 1', createdBy: 'user-123' }),
        createTask({ taskId: 'task-2', title: 'Task 2', createdBy: 'user-123' }),
        createTask({ taskId: 'task-3', title: 'Task 3', createdBy: 'user-123' }),
      ];
      repository.seed(tasks);

      const result = await listTasksUseCase(validContext, {}, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(3);
      }
    });

    it('should return empty array when no tasks', async () => {
      const result = await listTasksUseCase(validContext, {}, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
      }
    });

    it('should respect limit parameter', async () => {
      // Seed with 10 tasks
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTask({
          taskId: `task-${i}`,
          title: `Task ${i}`,
          createdBy: 'user-123',
          now: new Date(2024, 0, 1, 0, 0, i),
        })
      );
      repository.seed(tasks);

      const result = await listTasksUseCase(validContext, { limit: 5 }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(5);
      }
    });

    it('should return nextCursor for pagination', async () => {
      // Seed with 10 tasks
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTask({
          taskId: `task-${i}`,
          title: `Task ${i}`,
          createdBy: 'user-123',
          now: new Date(2024, 0, 1, 0, 0, i),
        })
      );
      repository.seed(tasks);

      const result = await listTasksUseCase(validContext, { limit: 5 }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.nextCursor).toBeDefined();
      }
    });

    it('should use cursor for offset', async () => {
      // Seed with tasks
      const tasks = [
        createTask({ taskId: 'task-1', title: 'Task 1', createdBy: 'user-123', now: new Date('2024-01-01') }),
        createTask({ taskId: 'task-2', title: 'Task 2', createdBy: 'user-123', now: new Date('2024-01-02') }),
        createTask({ taskId: 'task-3', title: 'Task 3', createdBy: 'user-123', now: new Date('2024-01-03') }),
      ];
      repository.seed(tasks);

      const firstResult = await listTasksUseCase(validContext, { limit: 1 }, repository);
      expect(firstResult.isOk()).toBe(true);

      if (firstResult.isOk()) {
        const cursor = firstResult.value.nextCursor;
        expect(cursor).toBeDefined();

        const secondResult = await listTasksUseCase(validContext, { limit: 1, cursor }, repository);
        expect(secondResult.isOk()).toBe(true);

        if (secondResult.isOk()) {
          expect(secondResult.value.items).toHaveLength(1);
          expect(secondResult.value.items[0].taskId).not.toBe(firstResult.value.items[0].taskId);
        }
      }
    });

    it('should return null nextCursor when no more items', async () => {
      // Seed with 3 tasks
      const tasks = Array.from({ length: 3 }, (_, i) =>
        createTask({
          taskId: `task-${i}`,
          title: `Task ${i}`,
          createdBy: 'user-123',
          now: new Date(2024, 0, 1, 0, 0, i),
        })
      );
      repository.seed(tasks);

      const result = await listTasksUseCase(validContext, { limit: 5 }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.nextCursor).toBeUndefined();
      }
    });
  });

  describe('Authorization', () => {
    it('should return FORBIDDEN without "task:read" permission', async () => {
      const contextWithoutPermission: ExecutionContext = {
        ...validContext,
        permissions: ['task:create'],
      };

      const result = await listTasksUseCase(contextWithoutPermission, {}, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('should return FORBIDDEN with empty permissions array', async () => {
      const contextWithoutPermission: ExecutionContext = {
        ...validContext,
        permissions: [],
      };

      const result = await listTasksUseCase(contextWithoutPermission, {}, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Result Type', () => {
    it('should return Ok result on success', async () => {
      const result = await listTasksUseCase(validContext, {}, repository);
      expect(result.isOk()).toBe(true);
    });

    it('should return Err result on failure', async () => {
      const contextWithoutPermission: ExecutionContext = {
        ...validContext,
        permissions: [],
      };

      const result = await listTasksUseCase(contextWithoutPermission, {}, repository);
      expect(result.isErr()).toBe(true);
    });

    it('should never throw uncaught errors', async () => {
      await expect(
        listTasksUseCase(validContext, {}, repository)
      ).resolves.not.toThrow();
    });
  });
});
