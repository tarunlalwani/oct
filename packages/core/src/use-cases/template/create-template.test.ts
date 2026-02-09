import { describe, it, expect, beforeEach } from 'vitest';
import { createTemplateUseCase } from './create-template.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';

describe('CreateTemplate Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['template:create', 'template:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should create template with minimal valid input', async () => {
      const result = await createTemplateUseCase(
        validContext,
        {
          name: 'Developer Template',
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.template.name).toBe('Developer Template');
        expect(result.value.template.kind).toBe('human');
        expect(result.value.template.templateId).toMatch(/^tmpl-/);
        expect(result.value.template.version).toBe(1);
      }
    });

    it('should create AI template', async () => {
      const result = await createTemplateUseCase(
        validContext,
        {
          name: 'AI Agent Template',
          kind: 'ai',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: false,
            canAutoApprove: true,
          },
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.template.kind).toBe('ai');
      }
    });

    it('should create template with description', async () => {
      const result = await createTemplateUseCase(
        validContext,
        {
          name: 'Developer Template',
          description: 'Template for software developers',
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.template.description).toBe('Template for software developers');
      }
    });

    it('should create template with skills', async () => {
      const result = await createTemplateUseCase(
        validContext,
        {
          name: 'Developer Template',
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
          skills: ['typescript', 'nodejs', 'react'],
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.template.skills).toEqual(['typescript', 'nodejs', 'react']);
      }
    });

    it('should trim template name', async () => {
      const result = await createTemplateUseCase(
        validContext,
        {
          name: '  Developer Template  ',
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.template.name).toBe('Developer Template');
      }
    });

    it('should set createdAt and updatedAt', async () => {
      const before = new Date().toISOString();
      const result = await createTemplateUseCase(
        validContext,
        {
          name: 'Developer Template',
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );
      const after = new Date().toISOString();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.template.createdAt).toBeGreaterThanOrEqual(before);
        expect(result.value.template.createdAt).toBeLessThanOrEqual(after);
        expect(result.value.template.updatedAt).toBe(result.value.template.createdAt);
      }
    });
  });

  describe('Validation Errors', () => {
    it('should return INVALID_INPUT for empty name', async () => {
      const result = await createTemplateUseCase(
        validContext,
        {
          name: '',
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for name >256 chars', async () => {
      const result = await createTemplateUseCase(
        validContext,
        {
          name: 'A'.repeat(257),
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for invalid kind', async () => {
      const result = await createTemplateUseCase(
        validContext,
        {
          name: 'Test',
          kind: 'robot' as 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('Authentication Errors', () => {
    it('should return UNAUTHORIZED for null actorId', async () => {
      const context: ExecutionContext = { ...validContext, actorId: null };
      const result = await createTemplateUseCase(
        context,
        {
          name: 'Developer Template',
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('Authorization Errors', () => {
    it('should return FORBIDDEN without template:create permission', async () => {
      const context: ExecutionContext = {
        ...validContext,
        permissions: ['template:read'],
      };

      const result = await createTemplateUseCase(
        context,
        {
          name: 'Developer Template',
          kind: 'human',
          defaultCapabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });
});
