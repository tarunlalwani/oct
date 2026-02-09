import { describe, it, expect, beforeEach } from 'vitest';
import { getProjectUseCase } from './get-project.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';

describe('GetProject Use Case', () => {
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
    it('should return project by id', async () => {
      const project: Project = {
        projectId: 'proj-123',
        name: 'Test Project',
        description: 'A test project',
        parentId: null,
        employeeIds: ['emp-1'],
        status: 'active',
        metadata: { key: 'value' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      adapter.seedProject(project);

      const result = await getProjectUseCase(validContext, { projectId: 'proj-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project).toEqual(project);
      }
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent project', async () => {
      const result = await getProjectUseCase(validContext, { projectId: 'non-existent' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });
});
