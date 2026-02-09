import { describe, it, expect, beforeEach } from 'vitest';
import { createTaskUseCase } from './create-task.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';
import type { Employee } from '../../schemas/employee.js';
import type { Task } from '../../schemas/task.js';

describe('CreateTask Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;
  let testProject: Project;
  let testEmployee: Employee;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:create', 'task:read'],
      environment: 'local',
    };

    testProject = {
      projectId: 'proj-123',
      name: 'Test Project',
      description: null,
      parentId: null,
      employeeIds: ['emp-456'],
      status: 'active',
      metadata: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    testEmployee = {
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
    };

    adapter.seedProject(testProject);
    adapter.seedEmployee(testEmployee);
  });

  describe('Success Cases', () => {
    it('should create task with minimal valid input', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.title).toBe('Test Task');
        expect(result.value.task.status).toBe('backlog');
        expect(result.value.task.taskId).toMatch(/^task-/);
      }
    });

    it('should create task with all fields', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
          context: 'Task context',
          goal: 'Task goal',
          deliverable: 'Task deliverable',
          priority: 'P0',
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.context).toBe('Task context');
        expect(result.value.task.goal).toBe('Task goal');
        expect(result.value.task.deliverable).toBe('Task deliverable');
        expect(result.value.task.priority).toBe('P0');
      }
    });

    it('should trim task title', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: '  Test Task  ',
          type: 'feature',
          ownerId: 'emp-456',
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.title).toBe('Test Task');
      }
    });

    it('should set default priority to P2', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.priority).toBe('P2');
      }
    });

    it('should set createdAt and updatedAt', async () => {
      const before = new Date().toISOString();
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
        },
        adapter
      );
      const after = new Date().toISOString();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.createdAt).toBeGreaterThanOrEqual(before);
        expect(result.value.task.createdAt).toBeLessThanOrEqual(after);
        expect(result.value.task.updatedAt).toBe(result.value.task.createdAt);
      }
    });
  });

  describe('Dependency Handling', () => {
    it('should create task with dependencies', async () => {
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

      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
          dependencies: ['task-dep'],
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.dependencies).toEqual(['task-dep']);
        expect(result.value.task.status).toBe('backlog'); // dep is done, so not blocked
      }
    });

    it('should block task when dependency is not done', async () => {
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

      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
          dependencies: ['task-dep'],
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.status).toBe('blocked');
        expect(result.value.task.blockedBy).toEqual(['task-dep']);
      }
    });

    it('should return NOT_FOUND for non-existent dependency', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
          dependencies: ['non-existent'],
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should detect circular dependencies', async () => {
      const taskA: Task = {
        taskId: 'task-a',
        projectId: 'proj-123',
        title: 'Task A',
        type: 'feature',
        ownerId: 'emp-456',
        context: null,
        goal: null,
        deliverable: null,
        status: 'backlog',
        priority: 'P2',
        dependencies: ['task-b'],
        blockedBy: [],
        approval: null,
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const taskB: Task = {
        taskId: 'task-b',
        projectId: 'proj-123',
        title: 'Task B',
        type: 'feature',
        ownerId: 'emp-456',
        context: null,
        goal: null,
        deliverable: null,
        status: 'backlog',
        priority: 'P2',
        dependencies: ['task-a'],
        blockedBy: [],
        approval: null,
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      adapter.seedTask(taskA);
      adapter.seedTask(taskB);

      // Try to create task C depending on A (which depends on B which depends on A)
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Task C',
          type: 'feature',
          ownerId: 'emp-456',
          dependencies: ['task-a'],
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });
  });

  describe('Validation Errors', () => {
    it('should return INVALID_INPUT for empty title', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: '',
          type: 'feature',
          ownerId: 'emp-456',
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for title >256 chars', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'A'.repeat(257),
          type: 'feature',
          ownerId: 'emp-456',
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for empty type', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: '',
          ownerId: 'emp-456',
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for invalid priority', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
          priority: 'P5' as 'P0',
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('Reference Validation', () => {
    it('should return NOT_FOUND for non-existent project', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'non-existent',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return NOT_FOUND for non-existent owner', async () => {
      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'non-existent',
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return FORBIDDEN when owner is not project member', async () => {
      const otherEmployee: Employee = {
        employeeId: 'emp-other',
        name: 'Other Employee',
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
      };
      adapter.seedEmployee(otherEmployee);

      const result = await createTaskUseCase(
        validContext,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-other',
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Authentication Errors', () => {
    it('should return UNAUTHORIZED for null actorId', async () => {
      const context: ExecutionContext = { ...validContext, actorId: null };
      const result = await createTaskUseCase(
        context,
        {
          projectId: 'proj-123',
          title: 'Test Task',
          type: 'feature',
          ownerId: 'emp-456',
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });
});
