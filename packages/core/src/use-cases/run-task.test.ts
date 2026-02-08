import { describe, it, expect, beforeEach } from 'vitest';
import { runTaskUseCase } from './run-task.js';
import { InMemoryTaskRepository } from '../test-utils/in-memory-repository.js';
import { createTask, updateTaskStatus } from '../domain/task.js';
import type { ExecutionContext } from '../schemas/context.js';

describe('RunTask Use Case', () => {
  let repository: InMemoryTaskRepository;
  let validContext: ExecutionContext;
  const pendingTaskId = 'task-pending';
  const runningTaskId = 'task-running';
  const completedTaskId = 'task-completed';

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:run', 'task:read'],
      environment: 'local',
    };

    // Seed with tasks in different states
    const pendingTask = createTask({
      taskId: pendingTaskId,
      title: 'Pending Task',
      createdBy: 'user-123',
    });

    const runningTask = updateTaskStatus(
      createTask({
        taskId: runningTaskId,
        title: 'Running Task',
        createdBy: 'user-123',
      }),
      'running'
    );

    const completedTask = updateTaskStatus(
      updateTaskStatus(
        createTask({
          taskId: completedTaskId,
          title: 'Completed Task',
          createdBy: 'user-123',
        }),
        'running'
      ),
      'completed'
    );

    repository.seed([pendingTask, runningTask, completedTask]);
  });

  describe('Success Cases', () => {
    it('should start pending task', async () => {
      const result = await runTaskUseCase(validContext, { taskId: pendingTaskId }, repository);

      expect(result.isOk()).toBe(true);
    });

    it('should set status to running', async () => {
      const result = await runTaskUseCase(validContext, { taskId: pendingTaskId }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('running');
      }
    });

    it('should set startedAt timestamp', async () => {
      const before = new Date();
      const result = await runTaskUseCase(validContext, { taskId: pendingTaskId }, repository);
      const after = new Date();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const startedAt = new Date(result.value.startedAt);
        expect(startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      }
    });

    it('should return taskId in output', async () => {
      const result = await runTaskUseCase(validContext, { taskId: pendingTaskId }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.taskId).toBe(pendingTaskId);
      }
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent task', async () => {
      const result = await runTaskUseCase(validContext, { taskId: 'nonexistent' }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return INVALID_INPUT for empty taskId', async () => {
      const result = await runTaskUseCase(validContext, { taskId: '' }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return CONFLICT if task is already running', async () => {
      const result = await runTaskUseCase(validContext, { taskId: runningTaskId }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return CONFLICT if task is already completed', async () => {
      const result = await runTaskUseCase(validContext, { taskId: completedTaskId }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return FORBIDDEN without "task:run" permission', async () => {
      const contextWithoutPermission: ExecutionContext = {
        ...validContext,
        permissions: ['task:read'],
      };

      const result = await runTaskUseCase(
        contextWithoutPermission,
        { taskId: pendingTaskId },
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

      const result = await runTaskUseCase(
        contextWithoutPermission,
        { taskId: pendingTaskId },
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
      const result = await runTaskUseCase(validContext, { taskId: pendingTaskId }, repository);
      expect(result.isOk()).toBe(true);
    });

    it('should return Err result on failure', async () => {
      const result = await runTaskUseCase(validContext, { taskId: 'nonexistent' }, repository);
      expect(result.isErr()).toBe(true);
    });

    it('should never throw uncaught errors', async () => {
      await expect(
        runTaskUseCase(validContext, { taskId: pendingTaskId }, repository)
      ).resolves.not.toThrow();
    });
  });
});
