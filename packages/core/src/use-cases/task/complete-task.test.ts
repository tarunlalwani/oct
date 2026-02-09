import { describe, it, expect, beforeEach } from 'vitest';
import { completeTaskUseCase } from './complete-task.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Task } from '../../schemas/task.js';
import type { Employee } from '../../schemas/employee.js';

describe('CompleteTask Use Case', () => {
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
    status: 'in_progress',
    priority: 'P2',
    dependencies: [],
    blockedBy: [],
    approval: null,
    metadata: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  const createTestEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    employeeId: 'emp-456',
    name: 'John Doe',
    kind: 'human',
    templateId: null,
    capabilities: {
      canExecuteTasks: true,
      canCreateTasks: true,
      canAutoApprove: false,
    },
    metadata: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  describe('Success Cases', () => {
    it('should complete task from in_progress status', async () => {
      adapter.seedTask(createTestTask({ status: 'in_progress' }));
      adapter.seedEmployee(createTestEmployee());

      const result = await completeTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.status).toBe('in_review');
      }
    });

    it('should complete task from todo status', async () => {
      adapter.seedTask(createTestTask({ status: 'todo' }));
      adapter.seedEmployee(createTestEmployee());

      const result = await completeTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.status).toBe('in_review');
      }
    });

    it('should auto-approve when owner has canAutoApprove capability', async () => {
      adapter.seedTask(createTestTask());
      adapter.seedEmployee(createTestEmployee({
        capabilities: {
          canExecuteTasks: true,
          canCreateTasks: true,
          canAutoApprove: true,
        },
      }));

      const result = await completeTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.status).toBe('done');
        expect(result.value.task.approval).not.toBeNull();
        expect(result.value.task.approval?.state).toBe('auto_approved');
        expect(result.value.task.approval?.approverId).toBe('emp-456');
      }
    });

    it('should update updatedAt timestamp', async () => {
      adapter.seedTask(createTestTask());
      adapter.seedEmployee(createTestEmployee());
      const before = new Date().toISOString();

      const result = await completeTaskUseCase(validContext, { taskId: 'task-123' }, adapter);
      const after = new Date().toISOString();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.updatedAt).toBeGreaterThanOrEqual(before);
        expect(result.value.task.updatedAt).toBeLessThanOrEqual(after);
      }
    });
  });

  describe('Unblocking Dependent Tasks', () => {
    it('should unblock dependent tasks when completed', async () => {
      const completedTask = createTestTask({ taskId: 'task-1', status: 'in_progress' });
      const dependentTask: Task = {
        taskId: 'task-2',
        projectId: 'proj-123',
        title: 'Dependent Task',
        type: 'feature',
        ownerId: 'emp-456',
        context: null,
        goal: null,
        deliverable: null,
        status: 'blocked',
        priority: 'P2',
        dependencies: ['task-1'],
        blockedBy: ['task-1'],
        approval: null,
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      adapter.seedTask(completedTask);
      adapter.seedTask(dependentTask);
      adapter.seedEmployee(createTestEmployee());

      const result = await completeTaskUseCase(validContext, { taskId: 'task-1' }, adapter);

      expect(result.isOk()).toBe(true);

      // Verify dependent task was unblocked
      const updatedDep = await adapter.getTask('task-2');
      expect(updatedDep.isOk() && updatedDep.value?.status).toBe('todo');
      expect(updatedDep.isOk() && updatedDep.value?.blockedBy).toEqual([]);
    });

    it('should not unblock if other dependencies are not done', async () => {
      const depTask: Task = {
        taskId: 'task-dep',
        projectId: 'proj-123',
        title: 'Other Dependency',
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
      const completedTask = createTestTask({ taskId: 'task-1', status: 'in_progress' });
      const dependentTask: Task = {
        taskId: 'task-2',
        projectId: 'proj-123',
        title: 'Dependent Task',
        type: 'feature',
        ownerId: 'emp-456',
        context: null,
        goal: null,
        deliverable: null,
        status: 'blocked',
        priority: 'P2',
        dependencies: ['task-1', 'task-dep'],
        blockedBy: ['task-1', 'task-dep'],
        approval: null,
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      adapter.seedTask(depTask);
      adapter.seedTask(completedTask);
      adapter.seedTask(dependentTask);
      adapter.seedEmployee(createTestEmployee());

      const result = await completeTaskUseCase(validContext, { taskId: 'task-1' }, adapter);

      expect(result.isOk()).toBe(true);

      // Verify dependent task is still blocked
      const updatedDep = await adapter.getTask('task-2');
      expect(updatedDep.isOk() && updatedDep.value?.status).toBe('blocked');
      expect(updatedDep.isOk() && updatedDep.value?.blockedBy).toEqual(['task-dep']);
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent task', async () => {
      adapter.seedEmployee(createTestEmployee());

      const result = await completeTaskUseCase(validContext, { taskId: 'non-existent' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return CONFLICT when task is blocked', async () => {
      adapter.seedTask(createTestTask({ status: 'blocked' }));
      adapter.seedEmployee(createTestEmployee());

      const result = await completeTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return CONFLICT when task is already done', async () => {
      adapter.seedTask(createTestTask({ status: 'done' }));
      adapter.seedEmployee(createTestEmployee());

      const result = await completeTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return CONFLICT when task is in_review', async () => {
      adapter.seedTask(createTestTask({ status: 'in_review' }));
      adapter.seedEmployee(createTestEmployee());

      const result = await completeTaskUseCase(validContext, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return UNAUTHORIZED for null actorId', async () => {
      adapter.seedTask(createTestTask());
      adapter.seedEmployee(createTestEmployee());
      const context: ExecutionContext = { ...validContext, actorId: null };

      const result = await completeTaskUseCase(context, { taskId: 'task-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });
});
