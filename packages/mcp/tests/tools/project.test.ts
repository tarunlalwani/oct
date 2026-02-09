import { describe, it, expect, beforeEach } from 'vitest';
import {
  handleProjectCreate,
  handleProjectList,
  handleProjectGet,
} from '../../src/tools/project.js';
import { InMemoryStorageAdapter } from '../test-utils.js';
import type { StorageAdapter } from '@oct/core';

describe('Project Tools', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  describe('handleProjectCreate', () => {
    it('should create a project with name', async () => {
      const result = await handleProjectCreate(
        { name: 'Test Project' },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.projectId).toBeDefined();
      expect(content.name).toBe('Test Project');
      expect(content.status).toBe('active');
      expect(content.createdAt).toBeDefined();
    });

    it('should create a project with description', async () => {
      const result = await handleProjectCreate(
        { name: 'Test Project', description: 'A test project' },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.name).toBe('Test Project');
    });

    it('should create a project with memberIds', async () => {
      const result = await handleProjectCreate(
        { name: 'Test Project', memberIds: ['worker-1', 'worker-2'] },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.projectId).toBeDefined();
    });

    it('should return error for missing name', async () => {
      const result = await handleProjectCreate({}, adapter);

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });
  });

  describe('handleProjectList', () => {
    it('should return empty array when no projects', async () => {
      const result = await handleProjectList({}, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.projects).toEqual([]);
    });

    it('should list all projects', async () => {
      await handleProjectCreate({ name: 'Project 1' }, adapter);
      await handleProjectCreate({ name: 'Project 2' }, adapter);

      const result = await handleProjectList({}, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.projects).toHaveLength(2);
    });

    it('should filter by status', async () => {
      await handleProjectCreate({ name: 'Project 1' }, adapter);
      // Create and archive a project
      const createResult = await handleProjectCreate({ name: 'Project 2' }, adapter);
      const { projectId } = JSON.parse(createResult.content[0].text);
      await adapter.saveProject({
        projectId,
        name: 'Project 2',
        description: '',
        parentId: null,
        memberIds: [],
        status: 'archived',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await handleProjectList({ status: 'archived' }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.projects).toHaveLength(1);
      expect(content.projects[0].status).toBe('archived');
    });

    it('should filter by parentId', async () => {
      const parentResult = await handleProjectCreate({ name: 'Parent Project' }, adapter);
      const { projectId: parentId } = JSON.parse(parentResult.content[0].text);

      await handleProjectCreate({ name: 'Child Project', parentId }, adapter);

      const result = await handleProjectList({ parentId }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.projects).toHaveLength(1);
      expect(content.projects[0].name).toBe('Child Project');
    });
  });

  describe('handleProjectGet', () => {
    it('should get project by id', async () => {
      const createResult = await handleProjectCreate(
        { name: 'Test Project', description: 'Test description' },
        adapter
      );
      const { projectId } = JSON.parse(createResult.content[0].text);

      const result = await handleProjectGet({ projectId }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.projectId).toBe(projectId);
      expect(content.name).toBe('Test Project');
      expect(content.description).toBe('Test description');
      expect(content.memberIds).toEqual([]);
    });

    it('should return error for missing projectId', async () => {
      const result = await handleProjectGet({}, adapter);

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });

    it('should return error for non-existent project', async () => {
      const result = await handleProjectGet(
        { projectId: 'non-existent-id' },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('NOT_FOUND');
    });
  });
});
