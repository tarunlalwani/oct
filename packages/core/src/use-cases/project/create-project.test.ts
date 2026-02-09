import { describe, it, expect, beforeEach } from 'vitest';
import { createProjectUseCase } from './create-project.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';

describe('CreateProject Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['project:create', 'project:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should create project with minimal valid input', async () => {
      const result = await createProjectUseCase(validContext, { name: 'Test Project' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.name).toBe('Test Project');
        expect(result.value.project.status).toBe('active');
        expect(result.value.project.projectId).toMatch(/^proj-/);
      }
    });

    it('should create project with description', async () => {
      const result = await createProjectUseCase(
        validContext,
        { name: 'Test Project', description: 'Project description' },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.description).toBe('Project description');
      }
    });

    it('should create sub-project with parent', async () => {
      // First create parent project
      const parentResult = await createProjectUseCase(validContext, { name: 'Parent Project' }, adapter);
      expect(parentResult.isOk()).toBe(true);
      const parentId = parentResult.isOk() ? parentResult.value.project.projectId : '';

      const result = await createProjectUseCase(
        validContext,
        { name: 'Sub Project', parentId },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.parentId).toBe(parentId);
      }
    });

    it('should create project with employeeIds', async () => {
      const result = await createProjectUseCase(
        validContext,
        { name: 'Test Project', employeeIds: ['emp-1', 'emp-2'] },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.employeeIds).toEqual(['emp-1', 'emp-2']);
      }
    });

    it('should trim project name', async () => {
      const result = await createProjectUseCase(
        validContext,
        { name: '  Test Project  ' },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.name).toBe('Test Project');
      }
    });

    it('should set createdAt and updatedAt', async () => {
      const before = new Date().toISOString();
      const result = await createProjectUseCase(validContext, { name: 'Test Project' }, adapter);
      const after = new Date().toISOString();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.createdAt).toBeGreaterThanOrEqual(before);
        expect(result.value.project.createdAt).toBeLessThanOrEqual(after);
        expect(result.value.project.updatedAt).toBe(result.value.project.createdAt);
      }
    });
  });

  describe('Validation Errors', () => {
    it('should return INVALID_INPUT for empty name', async () => {
      const result = await createProjectUseCase(validContext, { name: '' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for whitespace-only name', async () => {
      const result = await createProjectUseCase(validContext, { name: '   ' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for name >256 chars', async () => {
      const result = await createProjectUseCase(
        validContext,
        { name: 'A'.repeat(257) },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('Parent Project Validation', () => {
    it('should return NOT_FOUND for non-existent parent', async () => {
      const result = await createProjectUseCase(
        validContext,
        { name: 'Sub Project', parentId: 'non-existent' },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return CONFLICT for archived parent', async () => {
      // Create and archive parent
      const parentResult = await createProjectUseCase(validContext, { name: 'Parent' }, adapter);
      expect(parentResult.isOk()).toBe(true);
      const parentId = parentResult.isOk() ? parentResult.value.project.projectId : '';

      // Archive the parent by directly modifying storage
      const parent = await adapter.getProject(parentId);
      if (parent.isOk() && parent.value) {
        await adapter.saveProject({ ...parent.value, status: 'archived' } as Project);
      }

      const result = await createProjectUseCase(
        validContext,
        { name: 'Sub Project', parentId },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });
  });

  describe('Authentication Errors', () => {
    it('should return UNAUTHORIZED for null actorId', async () => {
      const context: ExecutionContext = { ...validContext, actorId: null };
      const result = await createProjectUseCase(context, { name: 'Test' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('Authorization Errors', () => {
    it('should return FORBIDDEN without project:create permission', async () => {
      const context: ExecutionContext = {
        ...validContext,
        permissions: ['project:read'],
      };

      const result = await createProjectUseCase(context, { name: 'Test' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('should return FORBIDDEN with empty permissions', async () => {
      const context: ExecutionContext = {
        ...validContext,
        permissions: [],
      };

      const result = await createProjectUseCase(context, { name: 'Test' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });
});
