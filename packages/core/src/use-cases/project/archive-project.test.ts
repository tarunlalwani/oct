import { describe, it, expect, beforeEach } from 'vitest';
import { archiveProjectUseCase } from './archive-project.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';
import type { Task } from '../../schemas/task.js';

describe('ArchiveProject Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['project:archive', 'project:read'],
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
    it('should archive project with all tasks done', async () => {
      adapter.seedProject(createTestProject());

      const task: Task = {
        taskId: 'task-1',
        projectId: 'proj-123',
        title: 'Done Task',
        type: 'feature',
        ownerId: 'emp-1',
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
      adapter.seedTask(task);

      const result = await archiveProjectUseCase(validContext, { projectId: 'proj-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.status).toBe('archived');
      }
    });

    it('should archive sub-projects recursively', async () => {
      const parentProject = createTestProject({ projectId: 'parent-1', name: 'Parent' });
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

      const result = await archiveProjectUseCase(validContext, { projectId: 'parent-1' }, adapter);

      expect(result.isOk()).toBe(true);

      // Verify sub-project was archived
      const subResult = await adapter.getProject('sub-1');
      expect(subResult.isOk() && subResult.value?.status).toBe('archived');
    });

    it('should update updatedAt timestamp', async () => {
      adapter.seedProject(createTestProject());
      const before = new Date().toISOString();

      const result = await archiveProjectUseCase(validContext, { projectId: 'proj-123' }, adapter);
      const after = new Date().toISOString();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.updatedAt).toBeGreaterThanOrEqual(before);
        expect(result.value.project.updatedAt).toBeLessThanOrEqual(after);
      }
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent project', async () => {
      const result = await archiveProjectUseCase(
        validContext,
        { projectId: 'non-existent' },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return CONFLICT when project has incomplete tasks', async () => {
      adapter.seedProject(createTestProject());

      const task: Task = {
        taskId: 'task-1',
        projectId: 'proj-123',
        title: 'Incomplete Task',
        type: 'feature',
        ownerId: 'emp-1',
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
      adapter.seedTask(task);

      const result = await archiveProjectUseCase(validContext, { projectId: 'proj-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should return UNAUTHORIZED for null actorId', async () => {
      adapter.seedProject(createTestProject());
      const context: ExecutionContext = { ...validContext, actorId: null };

      const result = await archiveProjectUseCase(context, { projectId: 'proj-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should return FORBIDDEN without project:archive permission', async () => {
      adapter.seedProject(createTestProject());
      const context: ExecutionContext = {
        ...validContext,
        permissions: ['project:read'],
      };

      const result = await archiveProjectUseCase(context, { projectId: 'proj-123' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });
});
