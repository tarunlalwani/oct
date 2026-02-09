import { describe, it, expect, beforeEach } from 'vitest';
import { createEmployeeUseCase } from './create-employee.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { EmployeeTemplate } from '../../schemas/template.js';

describe('CreateEmployee Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['employee:create', 'employee:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should create human employee with minimal input', async () => {
      const result = await createEmployeeUseCase(
        validContext,
        {
          name: 'John Doe',
          kind: 'human',
          capabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employee.name).toBe('John Doe');
        expect(result.value.employee.kind).toBe('human');
        expect(result.value.employee.employeeId).toMatch(/^emp-/);
      }
    });

    it('should create AI employee', async () => {
      const result = await createEmployeeUseCase(
        validContext,
        {
          name: 'AI Assistant',
          kind: 'ai',
          capabilities: {
            canExecuteTasks: true,
            canCreateTasks: false,
            canAutoApprove: true,
          },
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employee.kind).toBe('ai');
      }
    });

    it('should create employee with template', async () => {
      const template: EmployeeTemplate = {
        templateId: 'tmpl-1',
        name: 'Developer Template',
        description: null,
        kind: 'human',
        defaultCapabilities: {
          canExecuteTasks: true,
          canCreateTasks: true,
          canAutoApprove: false,
        },
        skills: ['typescript', 'nodejs'],
        metadata: null,
        version: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      adapter.seedTemplate(template);

      const result = await createEmployeeUseCase(
        validContext,
        {
          name: 'Jane Developer',
          kind: 'human',
          templateId: 'tmpl-1',
          capabilities: {
            canExecuteTasks: true,
            canCreateTasks: false, // Override template default
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employee.templateId).toBe('tmpl-1');
        // Capabilities should be merged
        expect(result.value.employee.capabilities.canCreateTasks).toBe(false);
      }
    });

    it('should trim employee name', async () => {
      const result = await createEmployeeUseCase(
        validContext,
        {
          name: '  John Doe  ',
          kind: 'human',
          capabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employee.name).toBe('John Doe');
      }
    });

    it('should set createdAt and updatedAt', async () => {
      const before = new Date().toISOString();
      const result = await createEmployeeUseCase(
        validContext,
        {
          name: 'John Doe',
          kind: 'human',
          capabilities: {
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
        expect(result.value.employee.createdAt).toBeGreaterThanOrEqual(before);
        expect(result.value.employee.createdAt).toBeLessThanOrEqual(after);
        expect(result.value.employee.updatedAt).toBe(result.value.employee.createdAt);
      }
    });
  });

  describe('Validation Errors', () => {
    it('should return INVALID_INPUT for empty name', async () => {
      const result = await createEmployeeUseCase(
        validContext,
        {
          name: '',
          kind: 'human',
          capabilities: {
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
      const result = await createEmployeeUseCase(
        validContext,
        {
          name: 'A'.repeat(257),
          kind: 'human',
          capabilities: {
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
      const result = await createEmployeeUseCase(
        validContext,
        {
          name: 'Test',
          kind: 'robot' as 'human',
          capabilities: {
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

  describe('Template Validation', () => {
    it('should return NOT_FOUND for non-existent template', async () => {
      const result = await createEmployeeUseCase(
        validContext,
        {
          name: 'Test',
          kind: 'human',
          templateId: 'non-existent',
          capabilities: {
            canExecuteTasks: true,
            canCreateTasks: true,
            canAutoApprove: false,
          },
        },
        adapter
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('Authentication Errors', () => {
    it('should return UNAUTHORIZED for null actorId', async () => {
      const context: ExecutionContext = { ...validContext, actorId: null };
      const result = await createEmployeeUseCase(
        context,
        {
          name: 'John Doe',
          kind: 'human',
          capabilities: {
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
    it('should return FORBIDDEN without employee:create permission', async () => {
      const context: ExecutionContext = {
        ...validContext,
        permissions: ['employee:read'],
      };

      const result = await createEmployeeUseCase(
        context,
        {
          name: 'John Doe',
          kind: 'human',
          capabilities: {
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
