import { describe, it, expect, beforeEach } from 'vitest';
import { startTaskUseCase } from './start-task.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Task } from '../../schemas/task.js';

describe('StartTask Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'emp-456',
      workspaceId: 'ws-456',
      permissions: ['task:read', 'task:update'],
      environment: 'local',
    };
  });

  const createTestTask = (overrides: Partial<Task> = {}): Task => ({
    taskId: 'task-123',
    projectId: 'proj-123',
    title: 'Test Task',
    type: 'feature',
    ownerId: 'emp-456',
    context: null,
    goal: null,
    deliverable: null,
    status: 'todo',
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
    it('should start task from todo status', async () => {
      adapter.seedTask(createTestTask({ status: 'todo' }));

      const result = await startTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.status).toBe('in_progress');
      }
    });

    it('should update updatedAt timestamp', async () => {
      adapter.seedTask(createTestTask());
      const before = new Date().toISOString();

      const result = await startTaskUseCase(validContext, { taskId: 'task-123' }, adapter);
      const after = new Date().toISOString();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.updatedAt).toBeGreaterThanOrEqual(before);
        expect(result.value.task.updatedAt).toBeLessThanOrEqual(after);
      }
    });
  });

  describe('Dependency Validation', () => {
    it('should return CONFLICT when dependencies are not done', async () => {
      const depTask: Task = {
        taskId: 'task-dep',
        projectId: 'proj-123',
        title: 'Dependency Task',
        type: 'feature',
        ownerId: 'emp-456',
        context: null,
        goal: null,
        deliverable: null,
        status: 'in_progress',
        priority: 'P2',
        dependencies: [],
        blockedBy: [],
        approval: null,
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      adapter.seedTask(depTask);
      adapter.seedTask(createTestTask({ dependencies: ['task-dep'] }));

      const result = await startTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should allow start when all dependencies are done', async () => {
      const depTask: Task = {
        taskId: 'task-dep',
        projectId: 'proj-123',
        title: 'Dependency Task',
        type: 'feature',
        ownerId: 'emp-456',
        context: null,
        goal: null,
        deliverable: null,
        status: 'done',
        priority: 'P2',
        dependencies: [],
        blockedBy: [],
        approval: null,
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      adapter.seedTask(depTask);
      adapter.seedTask(createTestTask({ dependencies: ['task-dep'] }));

      const result = await startTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.status).toBe('in_progress');
      }
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent task', async () => {
      const result = await startTaskUseCase(validContext, { taskId: 'non-existent' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return CONFLICT when task is already in progress', async () => {
      adapter.seedTask(createTestTask({ status: 'in_progress' }));

      const result = await startTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return UNAUTHORIZED for null actorId', async () => {
      adapter.seedTask(createTestTask());
      const context: ExecutionContext = { ...validContext, actorId: null };

      const result = await startTaskUseCase(context, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should return FORBIDDEN when not owner and no task:manage permission', async () => {
      adapter.seedTask(createTestTask({ ownerId: 'emp-other' }));
      const context: ExecutionContext = {
        ...validContext,
        actorId: 'emp-456',
        permissions: ['task:read'],
      };

      const result = await startTaskUseCase(context, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('should allow start with task:manage permission even if not owner', async () => {
      adapter.seedTask(createTestTask({ ownerId: 'emp-other' }));
      const context: ExecutionContext = {
        ...validContext,
        actorId: 'emp-456',
        permissions: ['task:read', 'task:manage'],
      };

      const result = await startTaskUseCase(context, { taskId: 'task-123' }, adapter);

      expect(result.isOk()).toBe(true);
    });
  });
});
