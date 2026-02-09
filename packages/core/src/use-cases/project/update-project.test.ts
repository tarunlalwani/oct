import { describe, it, expect, beforeEach } from 'vitest';
import { updateProjectUseCase } from './update-project.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';
import type { Task } from '../../schemas/task.js';

describe('UpdateProject Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['project:update', 'project:read'],
      environment: 'local',
    };
  });

  const createTestProject = (overrides: Partial<Project> = {}): Project => ({
    projectId: 'proj-123',
    name: 'Original Name',
    description: 'Original description',
    parentId: null,
    employeeIds: [],
    status: 'active',
    metadata: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  describe('Success Cases', () => {
    it('should update project name', async () => {
      adapter.seedProject(createTestProject());

      const result = await updateProjectUseCase(
        validContext,
        { projectId: 'proj-123', name: 'Updated Name' },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.name).toBe('Updated Name');
        expect(result.value.project.description).toBe('Original description'); // unchanged
      }
    });

    it('should update project description', async () => {
      adapter.seedProject(createTestProject());

      const result = await updateProjectUseCase(
        validContext,
        { projectId: 'proj-123', description: 'Updated description' },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.description).toBe('Updated description');
        expect(result.value.project.name).toBe('Original Name'); // unchanged
      }
    });

    it('should update project status', async () => {
      adapter.seedProject(createTestProject());

      const result = await updateProjectUseCase(
        validContext,
        { projectId: 'proj-123', status: 'paused' },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.status).toBe('paused');
      }
    });

    it('should update updatedAt timestamp', async () => {
      adapter.seedProject(createTestProject());
      const before = new Date().toISOString();

      const result = await updateProjectUseCase(
        validContext,
        { projectId: 'proj-123', name: 'Updated' },
        adapter
      );
      const after = new Date().toISOString();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.updatedAt).toBeGreaterThanOrEqual(before);
        expect(result.value.project.updatedAt).toBeLessThanOrEqual(after);
        expect(result.value.project.createdAt).toBe('2024-01-01T00:00:00.000Z'); // unchanged
      }
    });
  });

  describe('Archive Validation', () => {
    it('should allow archiving project with all tasks done', async () => {
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

      const result = await updateProjectUseCase(
        validContext,
        { projectId: 'proj-123', status: 'archived' },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.status).toBe('archived');
      }
    });

    it('should return CONFLICT when archiving with incomplete tasks', async () => {
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

      const result = await updateProjectUseCase(
        validContext,
        { projectId: 'proj-123', status: 'archived' },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
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

      const result = await updateProjectUseCase(
        validContext,
        { projectId: 'parent-1', status: 'archived' },
        adapter
      );

      expect(result.isOk()).toBe(true);

      // Verify sub-project was archived
      const subResult = await adapter.getProject('sub-1');
      expect(subResult.isOk() && subResult.value?.status).toBe('archived');
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent project', async () => {
      const result = await updateProjectUseCase(
        validContext,
        { projectId: 'non-existent', name: 'Updated' },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return UNAUTHORIZED for null actorId', async () => {
      adapter.seedProject(createTestProject());
      const context: ExecutionContext = { ...validContext, actorId: null };

      const result = await updateProjectUseCase(
        context,
        { projectId: 'proj-123', name: 'Updated' },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should return FORBIDDEN without project:update permission', async () => {
      adapter.seedProject(createTestProject());
      const context: ExecutionContext = {
        ...validContext,
        permissions: ['project:read'],
      };

      const result = await updateProjectUseCase(
        context,
        { projectId: 'proj-123', name: 'Updated' },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });
});
