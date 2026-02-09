import { describe, it, expect, beforeEach } from 'vitest';
import { deleteProjectUseCase } from './delete-project.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';
import type { Task } from '../../schemas/task.js';

describe('DeleteProject Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['project:delete', 'project:read'],
      environment: 'local',
    };
  });

  const createTestProject = (overrides: Partial<Project> = {}): Project => ({
    projectId: 'proj-123',
    name: 'Test Project',
    description: null,
    parentId: null,
    employeeIds: [],
    status: 'active',
    metadata: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  describe('Success Cases', () => {
    it('should delete project with no sub-projects or tasks', async () => {
      adapter.seedProject(createTestProject());

      const result = await deleteProjectUseCase(validContext, { projectId: 'proj-123' }, adapter);

      expect(result.isOk()).toBe(true);

      // Verify project was deleted
      const getResult = await adapter.getProject('proj-123');
      expect(getResult.isOk() && getResult.value).toBeNull();
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent project', async () => {
      const result = await deleteProjectUseCase(
        validContext,
        { projectId: 'non-existent' },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return CONFLICT when project has sub-projects', async () => {
      const parentProject = createTestProject({ projectId: 'parent-1' });
      const subProject: Project = {
        projectId: 'sub-1',
        name: 'Sub Project',
        description: null,
        parentId: 'parent-1',
        employeeIds: [],
        status: 'active',
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      adapter.seedProject(parentProject);
      adapter.seedProject(subProject);

      const result = await deleteProjectUseCase(validContext, { projectId: 'parent-1' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return CONFLICT when project has tasks', async () => {
      adapter.seedProject(createTestProject());

      const task: Task = {
        taskId: 'task-1',
        projectId: 'proj-123',
        title: 'Task',
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
      };
      adapter.seedTask(task);

      const result = await deleteProjectUseCase(validContext, { projectId: 'proj-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return UNAUTHORIZED for null actorId', async () => {
      adapter.seedProject(createTestProject());
      const context: ExecutionContext = { ...validContext, actorId: null };

      const result = await deleteProjectUseCase(context, { projectId: 'proj-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should return FORBIDDEN without project:delete permission', async () => {
      adapter.seedProject(createTestProject());
      const context: ExecutionContext = {
        ...validContext,
        permissions: ['project:read'],
      };

      const result = await deleteProjectUseCase(context, { projectId: 'proj-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });
});
