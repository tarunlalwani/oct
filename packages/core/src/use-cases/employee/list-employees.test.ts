import { describe, it, expect, beforeEach } from 'vitest';
import { listEmployeesUseCase } from './list-employees.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Employee } from '../../schemas/employee.js';

describe('ListEmployees Use Case', () => {
  let adapter: InMemoryStorageAdapter;
  let validContext: ExecutionContext;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['employee:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should return empty array when no employees exist', async () => {
      const result = await listEmployeesUseCase(validContext, {}, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employees).toEqual([]);
      }
    });

    it('should return all employees', async () => {
      const employee1: Employee = {
        employeeId: 'emp-1',
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
      const employee2: Employee = {
        employeeId: 'emp-2',
        name: 'AI Assistant',
        kind: 'ai',
        templateId: null,
        capabilities: {
          canExecuteTasks: true,
          canCreateTasks: false,
          canAutoApprove: true,
        },
        metadata: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      adapter.seedEmployee(employee1);
      adapter.seedEmployee(employee2);

      const result = await listEmployeesUseCase(validContext, {}, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employees).toHaveLength(2);
        expect(result.value.employees.map(e => e.employeeId)).toContain('emp-1');
        expect(result.value.employees.map(e => e.employeeId)).toContain('emp-2');
      }
    });

    it('should filter by kind', async () => {
      const humanEmployee: Employee = {
        employeeId: 'emp-1',
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
      const aiEmployee: Employee = {
        employeeId: 'emp-2',
        name: 'AI Assistant',
        kind: 'ai',
        templateId: null,
        capabilities: {
          canExecuteTasks: true,
          canCreateTasks: false,
          canAutoApprove: true,
        },
        metadata: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      adapter.seedEmployee(humanEmployee);
      adapter.seedEmployee(aiEmployee);

      const result = await listEmployeesUseCase(validContext, { filter: { kind: 'human' } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employees).toHaveLength(1);
        expect(result.value.employees[0].employeeId).toBe('emp-1');
      }
    });

    it('should filter by templateId', async () => {
      const employeeWithTemplate: Employee = {
        employeeId: 'emp-1',
        name: 'John Doe',
        kind: 'human',
        templateId: 'tmpl-1',
        capabilities: {
          canExecuteTasks: true,
          canCreateTasks: true,
          canAutoApprove: false,
        },
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const employeeWithoutTemplate: Employee = {
        employeeId: 'emp-2',
        name: 'Jane Doe',
        kind: 'human',
        templateId: null,
        capabilities: {
          canExecuteTasks: true,
          canCreateTasks: true,
          canAutoApprove: false,
        },
        metadata: null,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      adapter.seedEmployee(employeeWithTemplate);
      adapter.seedEmployee(employeeWithoutTemplate);

      const result = await listEmployeesUseCase(validContext, { filter: { templateId: 'tmpl-1' } }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employees).toHaveLength(1);
        expect(result.value.employees[0].employeeId).toBe('emp-1');
      }
    });
  });
});
