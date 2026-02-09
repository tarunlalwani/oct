import { describe, it, expect, beforeEach } from 'vitest';
import { listTemplatesUseCase } from './list-templates.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { EmployeeTemplate } from '../../schemas/template.js';

describe('ListTemplates Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['template:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should return empty array when no templates exist', async () => {
      const result = await listTemplatesUseCase(validContext, {}, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.templates).toEqual([]);
      }
    });

    it('should return all templates', async () => {
      const template1: EmployeeTemplate = {
        templateId: 'tmpl-1',
        name: 'Developer Template',
        description: null,
        kind: 'human',
        defaultCapabilities: {
          canExecuteTasks: true,
          canCreateTasks: true,
          canAutoApprove: false,
        },
        skills: ['typescript'],
        metadata: null,
        version: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const template2: EmployeeTemplate = {
        templateId: 'tmpl-2',
        name: 'AI Agent Template',
        description: null,
        kind: 'ai',
        defaultCapabilities: {
          canExecuteTasks: true,
          canCreateTasks: false,
          canAutoApprove: true,
        },
        skills: ['code-generation'],
        metadata: null,
        version: 1,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      adapter.seedTemplate(template1);
      adapter.seedTemplate(template2);

      const result = await listTemplatesUseCase(validContext, {}, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.templates).toHaveLength(2);
        expect(result.value.templates.map(t => t.templateId)).toContain('tmpl-1');
        expect(result.value.templates.map(t => t.templateId)).toContain('tmpl-2');
      }
    });
  });
});
