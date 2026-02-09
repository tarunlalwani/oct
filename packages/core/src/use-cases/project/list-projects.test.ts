import { describe, it, expect, beforeEach } from 'vitest';
import { listProjectsUseCase } from './list-projects.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';

describe('ListProjects Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['project:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should return empty array when no projects exist', async () => {
      const result = await listProjectsUseCase(validContext, {}, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.projects).toEqual([]);
      }
    });

    it('should return all projects', async () => {
      const project1: Project = {
        projectId: 'proj-1',
        name: 'Project 1',
        description: null,
        parentId: null,
        employeeIds: [],
        status: 'active',
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const project2: Project = {
        projectId: 'proj-2',
        name: 'Project 2',
        description: null,
        parentId: null,
        employeeIds: [],
        status: 'active',
        metadata: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      adapter.seedProject(project1);
      adapter.seedProject(project2);

      const result = await listProjectsUseCase(validContext, {}, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.projects).toHaveLength(2);
        expect(result.value.projects.map(p => p.projectId)).toContain('proj-1');
        expect(result.value.projects.map(p => p.projectId)).toContain('proj-2');
      }
    });

    it('should filter by status', async () => {
      const activeProject: Project = {
        projectId: 'proj-1',
        name: 'Active Project',
        description: null,
        parentId: null,
        employeeIds: [],
        status: 'active',
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const archivedProject: Project = {
        projectId: 'proj-2',
        name: 'Archived Project',
        description: null,
        parentId: null,
        employeeIds: [],
        status: 'archived',
        metadata: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      adapter.seedProject(activeProject);
      adapter.seedProject(archivedProject);

      const result = await listProjectsUseCase(validContext, { filter: { status: 'active' } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.projects).toHaveLength(1);
        expect(result.value.projects[0].projectId).toBe('proj-1');
      }
    });

    it('should filter by parentId', async () => {
      const parentProject: Project = {
        projectId: 'parent-1',
        name: 'Parent Project',
        description: null,
        parentId: null,
        employeeIds: [],
        status: 'active',
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const subProject: Project = {
        projectId: 'sub-1',
        name: 'Sub Project',
        description: null,
        parentId: 'parent-1',
        employeeIds: [],
        status: 'active',
        metadata: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      adapter.seedProject(parentProject);
      adapter.seedProject(subProject);

      const result = await listProjectsUseCase(validContext, { filter: { parentId: 'parent-1' } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.projects).toHaveLength(1);
        expect(result.value.projects[0].projectId).toBe('sub-1');
      }
    });

    it('should filter for root projects (parentId: null)', async () => {
      const parentProject: Project = {
        projectId: 'parent-1',
        name: 'Parent Project',
        description: null,
        parentId: null,
        employeeIds: [],
        status: 'active',
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const subProject: Project = {
        projectId: 'sub-1',
        name: 'Sub Project',
        description: null,
        parentId: 'parent-1',
        employeeIds: [],
        status: 'active',
        metadata: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      adapter.seedProject(parentProject);
      adapter.seedProject(subProject);

      const result = await listProjectsUseCase(validContext, { filter: { parentId: null } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.projects).toHaveLength(1);
        expect(result.value.projects[0].projectId).toBe('parent-1');
      }
    });
  });

  describe('Anonymous Access', () => {
    it('should allow anonymous listing (no auth required)', async () => {
      const context: ExecutionContext = { ...validContext, actorId: null };
      const result = await listProjectsUseCase(context, {}, adapter);

      expect(result.isOk()).toBe(true);
    });
  });
});
