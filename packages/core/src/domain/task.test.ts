import { describe, it, expect } from 'vitest';
import { createTask, updateTaskStatus } from './task.js';

describe('Task Domain Model', () => {
  describe('createTask', () => {
    it('should create task with valid title (1-256 chars)', () => {
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
      });

      expect(task.taskId).toBe('task-123');
      expect(task.title).toBe('Test Task');
      expect(task.createdBy).toBe('user-123');
    });

    it('should set initial status to "pending"', () => {
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
      });

      expect(task.status).toBe('pending');
    });

    it('should set createdAt to current timestamp', () => {
      const before = new Date();
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
      });
      const after = new Date();

      const createdAt = new Date(task.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set updatedAt to current timestamp', () => {
      const before = new Date();
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
      });
      const after = new Date();

      const updatedAt = new Date(task.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should accept valid description', () => {
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
        description: 'Task description',
      });

      expect(task.description).toBe('Task description');
    });

    it('should accept null description', () => {
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
        description: null,
      });

      expect(task.description).toBeNull();
    });

    it('should accept valid metadata object', () => {
      const metadata = { key: 'value', nested: { foo: 'bar' } };
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
        metadata,
      });

      expect(task.metadata).toEqual(metadata);
    });

    it('should accept null metadata', () => {
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
        metadata: null,
      });

      expect(task.metadata).toBeNull();
    });

    it('should use provided now date', () => {
      const now = new Date('2024-01-15T10:30:00.000Z');
      const task = createTask({
        taskId: 'task-123',
        title: 'Test Task',
        createdBy: 'user-123',
        now,
      });

      expect(task.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(task.updatedAt).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('updateTaskStatus', () => {
    const baseTask = createTask({
      taskId: 'task-123',
      title: 'Test Task',
      createdBy: 'user-123',
      now: new Date('2024-01-15T10:00:00.000Z'),
    });

    it('should update status to running', () => {
      const updated = updateTaskStatus(baseTask, 'running');
      expect(updated.status).toBe('running');
    });

    it('should update status to completed', () => {
      const running = updateTaskStatus(baseTask, 'running');
      const completed = updateTaskStatus(running, 'completed');
      expect(completed.status).toBe('completed');
    });

    it('should update status to failed', () => {
      const running = updateTaskStatus(baseTask, 'running');
      const failed = updateTaskStatus(running, 'failed');
      expect(failed.status).toBe('failed');
    });

    it('should update status to cancelled', () => {
      const updated = updateTaskStatus(baseTask, 'cancelled');
      expect(updated.status).toBe('cancelled');
    });

    it('should update updatedAt timestamp', () => {
      const later = new Date('2024-01-15T11:00:00.000Z');
      const updated = updateTaskStatus(baseTask, 'running', later);
      expect(updated.updatedAt).toBe('2024-01-15T11:00:00.000Z');
    });

    it('should not modify createdAt', () => {
      const updated = updateTaskStatus(baseTask, 'running');
      expect(updated.createdAt).toBe(baseTask.createdAt);
    });

    it('should not modify taskId', () => {
      const updated = updateTaskStatus(baseTask, 'running');
      expect(updated.taskId).toBe(baseTask.taskId);
    });

    it('should not modify createdBy', () => {
      const updated = updateTaskStatus(baseTask, 'running');
      expect(updated.createdBy).toBe(baseTask.createdBy);
    });

    it('should not modify title', () => {
      const updated = updateTaskStatus(baseTask, 'running');
      expect(updated.title).toBe(baseTask.title);
    });

    it('should not modify description', () => {
      const updated = updateTaskStatus(baseTask, 'running');
      expect(updated.description).toBe(baseTask.description);
    });

    it('should not modify metadata', () => {
      const updated = updateTaskStatus(baseTask, 'running');
      expect(updated.metadata).toEqual(baseTask.metadata);
    });

    it('should create a new object (immutable)', () => {
      const updated = updateTaskStatus(baseTask, 'running');
      expect(updated).not.toBe(baseTask);
    });
  });
});
