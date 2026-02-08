import { describe, it, expect, beforeEach } from 'vitest';
import { getTaskUseCase } from './get-task.js';
import { InMemoryTaskRepository } from '../test-utils/in-memory-repository.js';
import { createTask } from '../domain/task.js';
import type { ExecutionContext } from '../schemas/context.js';

describe('GetTask Use Case', () => {
  let repository: InMemoryTaskRepository;
  let validContext: ExecutionContext;
  const existingTaskId = 'task-123';

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:read'],
      environment: 'local',
    };

    // Seed with an existing task
    const existingTask = createTask({
      taskId: existingTaskId,
      title: 'Existing Task',
      createdBy: 'user-123',
    });
    repository.seed([existingTask]);
  });

  describe('Success Cases', () => {
    it('should return task by id', async () => {
      const result = await getTaskUseCase(validContext, { taskId: existingTaskId }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.taskId).toBe(existingTaskId);
      }
    });

    it('should return complete task object', async () => {
      const result = await getTaskUseCase(validContext, { taskId: existingTaskId }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task).toHaveProperty('taskId');
        expect(result.value.task).toHaveProperty('status');
        expect(result.value.task).toHaveProperty('title');
        expect(result.value.task).toHaveProperty('createdAt');
        expect(result.value.task).toHaveProperty('updatedAt');
        expect(result.value.task).toHaveProperty('createdBy');
      }
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent taskId', async () => {
      const result = await getTaskUseCase(validContext, { taskId: 'nonexistent' }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return INVALID_INPUT for empty taskId', async () => {
      const result = await getTaskUseCase(validContext, { taskId: '' }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for whitespace-only taskId', async () => {
      const result = await getTaskUseCase(validContext, { taskId: '   ' }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return FORBIDDEN without "task:read" permission', async () => {
      const contextWithoutPermission: ExecutionContext = {
        ...validContext,
        permissions: ['task:create'],
      };

      const result = await getTaskUseCase(
        contextWithoutPermission,
        { taskId: existingTaskId },
        repository
      );

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

      const result = await getTaskUseCase(
        contextWithoutPermission,
        { taskId: existingTaskId },
        repository
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Result Type', () => {
    it('should return Ok result on success', async () => {
      const result = await getTaskUseCase(validContext, { taskId: existingTaskId }, repository);
      expect(result.isOk()).toBe(true);
    });

    it('should return Err result on failure', async () => {
      const result = await getTaskUseCase(validContext, { taskId: 'nonexistent' }, repository);
      expect(result.isErr()).toBe(true);
    });

    it('should never throw uncaught errors', async () => {
      await expect(
        getTaskUseCase(validContext, { taskId: existingTaskId }, repository)
      ).resolves.not.toThrow();
    });
  });
});
