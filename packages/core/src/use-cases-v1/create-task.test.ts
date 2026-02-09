import { describe, it, expect, beforeEach } from 'vitest';
import { createTaskUseCase } from './create-task.js';
import { InMemoryTaskRepository } from '../test-utils/in-memory-repository.js';
import type { ExecutionContext } from '../schemas/context.js';

describe('CreateTask Use Case', () => {
  let repository: InMemoryTaskRepository;
  let validContext: ExecutionContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:create', 'task:read'],
      environment: 'local',
    };
  });

  describe('Success Cases', () => {
    it('should create task with minimal valid input (title only)', async () => {
      const result = await createTaskUseCase(validContext, { title: 'Test Task' }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.title).toBe('Test Task');
        expect(result.value.task.status).toBe('pending');
      }
    });

    it('should create task with description', async () => {
      const result = await createTaskUseCase(
        validContext,
        { title: 'Test Task', description: 'Task description' },
        repository
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.description).toBe('Task description');
      }
    });

    it('should create task with metadata', async () => {
      const metadata = { key: 'value' };
      const result = await createTaskUseCase(
        validContext,
        { title: 'Test Task', metadata },
        repository
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.metadata).toEqual(metadata);
      }
    });

    it('should return task in output', async () => {
      const result = await createTaskUseCase(validContext, { title: 'Test Task' }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task).toBeDefined();
        expect(result.value.task.taskId).toBeDefined();
        expect(result.value.task.title).toBe('Test Task');
      }
    });

    it('should set status to pending', async () => {
      const result = await createTaskUseCase(validContext, { title: 'Test Task' }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.status).toBe('pending');
      }
    });

    it('should generate unique taskId', async () => {
      const result1 = await createTaskUseCase(validContext, { title: 'Task 1' }, repository);
      const result2 = await createTaskUseCase(validContext, { title: 'Task 2' }, repository);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.task.taskId).not.toBe(result2.value.task.taskId);
      }
    });

    it('should set createdBy from context', async () => {
      const result = await createTaskUseCase(validContext, { title: 'Test Task' }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.createdBy).toBe('user-123');
      }
    });

    it('should trim title whitespace', async () => {
      const result = await createTaskUseCase(validContext, { title: '  Test Task  ' }, repository);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.task.title).toBe('Test Task');
      }
    });
  });

  describe('Validation Errors', () => {
    it('should return INVALID_INPUT for missing title', async () => {
      const result = await createTaskUseCase(validContext, { title: '' }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for empty title (whitespace only)', async () => {
      const result = await createTaskUseCase(validContext, { title: '   ' }, repository);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT for title >256 chars', async () => {
      const result = await createTaskUseCase(
        validContext,
        { title: 'A'.repeat(257) },
        repository
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('Authorization Errors', () => {
    it('should return FORBIDDEN without "task:create" permission', async () => {
      const contextWithoutPermission: ExecutionContext = {
        ...validContext,
        permissions: ['task:read'],
      };

      const result = await createTaskUseCase(
        contextWithoutPermission,
        { title: 'Test Task' },
        repository
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('should return FORBIDDEN with empty permissions array', async () => {
      const contextWithoutPermission: ExecutionContext = {
        ...validContext,
        permissions: [],
      };

      const result = await createTaskUseCase(
        contextWithoutPermission,
        { title: 'Test Task' },
        repository
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Result Type', () => {
    it('should return Ok result on success', async () => {
      const result = await createTaskUseCase(validContext, { title: 'Test Task' }, repository);
      expect(result.isOk()).toBe(true);
    });

    it('should return Err result on failure', async () => {
      const result = await createTaskUseCase(validContext, { title: '' }, repository);
      expect(result.isErr()).toBe(true);
    });

    it('should never throw uncaught errors', async () => {
      await expect(
        createTaskUseCase(validContext, { title: 'Test Task' }, repository)
      ).resolves.not.toThrow();
    });
  });
});
