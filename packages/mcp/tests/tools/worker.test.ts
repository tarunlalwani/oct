import { describe, it, expect, beforeEach } from 'vitest';
import {
  handleWorkerCreate,
  handleWorkerList,
  handleWorkerGet,
  handleWorkerDelete,
} from '../../src/tools/worker.js';
import { InMemoryStorageAdapter } from '../test-utils.js';
import type { StorageAdapter, Worker } from '@oct/core';

describe('Worker Tools', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  describe('handleWorkerCreate', () => {
    it('should create a human worker', async () => {
      const result = await handleWorkerCreate(
        { name: 'John Doe', type: 'human', roles: ['developer'] },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.workerId).toBeDefined();
      expect(content.name).toBe('John Doe');
      expect(content.type).toBe('human');
      expect(content.roles).toEqual(['developer']);
      expect(content.createdAt).toBeDefined();
    });

    it('should create an agent worker', async () => {
      const result = await handleWorkerCreate(
        { name: 'AI Assistant', type: 'agent', roles: ['helper'] },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.type).toBe('agent');
    });

    it('should default to human type', async () => {
      const result = await handleWorkerCreate(
        { name: 'Test Worker' },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.type).toBe('human');
    });

    it('should default empty roles array', async () => {
      const result = await handleWorkerCreate(
        { name: 'Test Worker', type: 'human' },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.roles).toEqual([]);
    });
  });

  describe('handleWorkerList', () => {
    it('should return empty array when no workers', async () => {
      const result = await handleWorkerList({}, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.workers).toEqual([]);
    });

    it('should list all workers', async () => {
      await handleWorkerCreate({ name: 'Worker 1', type: 'human' }, adapter);
      await handleWorkerCreate({ name: 'Worker 2', type: 'agent' }, adapter);

      const result = await handleWorkerList({}, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.workers).toHaveLength(2);
    });

    it('should filter by type', async () => {
      await handleWorkerCreate({ name: 'Human Worker', type: 'human' }, adapter);
      await handleWorkerCreate({ name: 'Agent Worker', type: 'agent' }, adapter);

      const result = await handleWorkerList({ type: 'agent' }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.workers).toHaveLength(1);
      expect(content.workers[0].type).toBe('agent');
    });
  });

  describe('handleWorkerGet', () => {
    it('should get worker by id', async () => {
      const createResult = await handleWorkerCreate(
        { name: 'Test Worker', type: 'human', roles: ['admin'] },
        adapter
      );
      const { workerId } = JSON.parse(createResult.content[0].text);

      const result = await handleWorkerGet({ workerId }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.workerId).toBe(workerId);
      expect(content.name).toBe('Test Worker');
      expect(content.permissions).toBeDefined();
    });

    it('should return error for missing workerId', async () => {
      const result = await handleWorkerGet({}, adapter);

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });

    it('should return error for non-existent worker', async () => {
      const result = await handleWorkerGet(
        { workerId: 'non-existent-id' },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('NOT_FOUND');
    });
  });

  describe('handleWorkerDelete', () => {
    it('should delete worker by id', async () => {
      const createResult = await handleWorkerCreate(
        { name: 'Test Worker', type: 'human' },
        adapter
      );
      const { workerId } = JSON.parse(createResult.content[0].text);

      const result = await handleWorkerDelete({ workerId }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.success).toBe(true);

      // Verify worker is gone
      const getResult = await handleWorkerGet({ workerId }, adapter);
      expect(getResult.isError).toBe(true);
    });

    it('should return error for missing workerId', async () => {
      const result = await handleWorkerDelete({}, adapter);

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });

    it('should return error for non-existent worker', async () => {
      const result = await handleWorkerDelete(
        { workerId: 'non-existent-id' },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('NOT_FOUND');
    });
  });
});
