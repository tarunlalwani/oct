import { describe, it, expect, beforeEach } from 'vitest';
import { getEmployeeUseCase } from './get-employee.js';
import { InMemoryStorageAdapter } from '../../test-utils/in-memory-storage-adapter.js';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Employee } from '../../schemas/employee.js';

describe('GetEmployee Use Case', () => {
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
    it('should return employee by id', async () => {
      const employee: Employee = {
        employeeId: 'emp-123',
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
      adapter.seedEmployee(employee);

      const result = await getEmployeeUseCase(validContext, { employeeId: 'emp-123' }, adapter);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.employee).toEqual(employee);
      }
    });
  });

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent employee', async () => {
      const result = await getEmployeeUseCase(validContext, { employeeId: 'non-existent' }, adapter);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });
});
