import { describe, it, expect, beforeEach } from 'vitest';
import { listTasksUseCase } from './list-tasks.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Task } from '../../schemas/task.js';

describe('ListTasks Use Case', () => {
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

  const createTask = (overrides: Partial<Task> = {}): Task => ({
    taskId: 'task-1',
    projectId: 'proj-1',
    title: 'Test Task',
    type: 'feature',
    ownerId: 'emp-1',
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
    ...overrides,
  });

  describe('Success Cases', () => {
    it('should return empty array when no tasks exist', async () => {
      const result = await listTasksUseCase(validContext, {}, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks).toEqual([]);
      }
    });

    it('should return all tasks', async () => {
      adapter.seedTask(createTask({ taskId: 'task-1', title: 'Task 1' }));
      adapter.seedTask(createTask({ taskId: 'task-2', title: 'Task 2' }));

      const result = await listTasksUseCase(validContext, {}, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks).toHaveLength(2);
      }
    });

    it('should filter by projectId', async () => {
      adapter.seedTask(createTask({ taskId: 'task-1', projectId: 'proj-1' }));
      adapter.seedTask(createTask({ taskId: 'task-2', projectId: 'proj-2' }));

      const result = await listTasksUseCase(validContext, { filter: { projectId: 'proj-1' } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks).toHaveLength(1);
        expect(result.value.tasks[0].taskId).toBe('task-1');
      }
    });

    it('should filter by ownerId', async () => {
      adapter.seedTask(createTask({ taskId: 'task-1', ownerId: 'emp-1' }));
      adapter.seedTask(createTask({ taskId: 'task-2', ownerId: 'emp-2' }));

      const result = await listTasksUseCase(validContext, { filter: { ownerId: 'emp-1' } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks).toHaveLength(1);
        expect(result.value.tasks[0].taskId).toBe('task-1');
      }
    });

    it('should filter by status', async () => {
      adapter.seedTask(createTask({ taskId: 'task-1', status: 'in_progress' }));
      adapter.seedTask(createTask({ taskId: 'task-2', status: 'done' }));

      const result = await listTasksUseCase(validContext, { filter: { status: 'in_progress' } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks).toHaveLength(1);
        expect(result.value.tasks[0].taskId).toBe('task-1');
      }
    });

    it('should filter by priority', async () => {
      adapter.seedTask(createTask({ taskId: 'task-1', priority: 'P0' }));
      adapter.seedTask(createTask({ taskId: 'task-2', priority: 'P2' }));

      const result = await listTasksUseCase(validContext, { filter: { priority: 'P0' } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks).toHaveLength(1);
        expect(result.value.tasks[0].taskId).toBe('task-1');
      }
    });
  });

  describe('Error Cases', () => {
    it('should return UNAUTHORIZED for null actorId', async () => {
      const context: ExecutionContext = { ...validContext, actorId: null };
      const result = await listTasksUseCase(context, {}, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });
});
