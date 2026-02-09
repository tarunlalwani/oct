import { describe, it, expect, beforeEach } from 'vitest';
import { getTaskUseCase } from './get-task.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Task } from '../../schemas/task.js';

describe('GetTask Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should return task by id', async () => {
      const task: Task = {
        taskId: 'task-123',
        projectId: 'proj-123',
        title: 'Test Task',
        type: 'feature',
        ownerId: 'emp-456',
        context: 'Task context',
        goal: 'Task goal',
        deliverable: 'Task deliverable',
        status: 'in_progress',
        priority: 'P1',
        dependencies: [],
        blockedBy: [],
        approval: null,
        metadata: { key: 'value' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      adapter.seedTask(task);

      const result = await getTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task).toEqual(task);
      }
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent task', async () => {
      const result = await getTaskUseCase(validContext, { taskId: 'non-existent' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return UNAUTHORIZED for null actorId', async () => {
      const context: ExecutionContext = { ...validContext, actorId: null };
      const result = await getTaskUseCase(context, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });
});
