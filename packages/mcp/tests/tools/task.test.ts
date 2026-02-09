import { describe, it, expect, beforeEach } from 'vitest';
import {
  handleTaskCreate,
  handleTaskList,
  handleTaskGet,
  handleTaskUpdate,
} from '../../src/tools/task.js';
import {
  handleWorkerCreate,
} from '../../src/tools/worker.js';
import {
  handleProjectCreate,
} from '../../src/tools/project.js';
import { InMemoryStorageAdapter } from '../test-utils.js';
import type { StorageAdapter } from '@oct/core';

describe('Task Tools', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  async function setupWorkerAndProject() {
    const workerResult = await handleWorkerCreate(
      { name: 'Test Worker', type: 'human' },
      adapter
    );
    const { workerId } = JSON.parse(workerResult.content[0].text);

    const projectResult = await handleProjectCreate(
      { name: 'Test Project', memberIds: [workerId] },
      adapter
    );
    const { projectId } = JSON.parse(projectResult.content[0].text);

    return { workerId, projectId };
  }

  describe('handleTaskCreate', () => {
    it('should create a task', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      const result = await handleTaskCreate(
        { projectId, title: 'Test Task', ownerId: workerId },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.taskId).toBeDefined();
      expect(content.title).toBe('Test Task');
      expect(content.projectId).toBe(projectId);
      expect(content.ownerId).toBe(workerId);
      expect(content.status).toBe('backlog');
      expect(content.priority).toBe(2);
    });

    it('should create a task with custom priority', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      const result = await handleTaskCreate(
        { projectId, title: 'High Priority Task', ownerId: workerId, priority: 1 },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.priority).toBe(1);
    });

    it('should create a task with dependencies', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      const task1Result = await handleTaskCreate(
        { projectId, title: 'Task 1', ownerId: workerId },
        adapter
      );
      const { taskId: taskId1 } = JSON.parse(task1Result.content[0].text);

      const result = await handleTaskCreate(
        { projectId, title: 'Task 2', ownerId: workerId, dependencies: [taskId1] },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.dependencies).toEqual([taskId1]);
      expect(content.status).toBe('blocked');
    });

    it('should return error for missing projectId', async () => {
      const result = await handleTaskCreate(
        { title: 'Test', ownerId: 'worker-1' },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });

    it('should return error for missing title', async () => {
      const result = await handleTaskCreate(
        { projectId: 'proj-1', ownerId: 'worker-1' },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });

    it('should return error for missing ownerId', async () => {
      const result = await handleTaskCreate(
        { projectId: 'proj-1', title: 'Test' },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });

    it('should return error for invalid priority', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      const result = await handleTaskCreate(
        { projectId, title: 'Test', ownerId: workerId, priority: 5 },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });
  });

  describe('handleTaskList', () => {
    it('should return empty array when no tasks', async () => {
      const result = await handleTaskList({}, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.tasks).toEqual([]);
    });

    it('should list all tasks', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      await handleTaskCreate({ projectId, title: 'Task 1', ownerId: workerId }, adapter);
      await handleTaskCreate({ projectId, title: 'Task 2', ownerId: workerId }, adapter);

      const result = await handleTaskList({}, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.tasks).toHaveLength(2);
    });

    it('should filter by projectId', async () => {
      const { workerId, projectId: projectId1 } = await setupWorkerAndProject();
      const project2Result = await handleProjectCreate(
        { name: 'Project 2', memberIds: [workerId] },
        adapter
      );
      const { projectId: projectId2 } = JSON.parse(project2Result.content[0].text);

      await handleTaskCreate({ projectId: projectId1, title: 'Task 1', ownerId: workerId }, adapter);
      await handleTaskCreate({ projectId: projectId2, title: 'Task 2', ownerId: workerId }, adapter);

      const result = await handleTaskList({ projectId: projectId1 }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.tasks).toHaveLength(1);
      expect(content.tasks[0].title).toBe('Task 1');
    });

    it('should filter by ownerId', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();
      const worker2Result = await handleWorkerCreate(
        { name: 'Worker 2', type: 'human' },
        adapter
      );
      const { workerId: workerId2 } = JSON.parse(worker2Result.content[0].text);

      // Add worker2 to the project so they can own tasks
      const projectResult = await adapter.getProject(projectId);
      if (projectResult.isOk() && projectResult.value) {
        const project = projectResult.value;
        project.memberIds.push(workerId2);
        await adapter.saveProject(project);
      }

      await handleTaskCreate({ projectId, title: 'Task 1', ownerId: workerId }, adapter);
      await handleTaskCreate({ projectId, title: 'Task 2', ownerId: workerId2 }, adapter);

      const result = await handleTaskList({ ownerId: workerId2 }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.tasks).toHaveLength(1);
      expect(content.tasks[0].title).toBe('Task 2');
    });

    it('should filter by status', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      await handleTaskCreate({ projectId, title: 'Task 1', ownerId: workerId }, adapter);

      const result = await handleTaskList({ status: 'backlog' }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.tasks).toHaveLength(1);
    });

    it('should filter by priority', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      await handleTaskCreate({ projectId, title: 'Task 1', ownerId: workerId, priority: 1 }, adapter);
      await handleTaskCreate({ projectId, title: 'Task 2', ownerId: workerId, priority: 2 }, adapter);

      const result = await handleTaskList({ priority: 1 }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.tasks).toHaveLength(1);
      expect(content.tasks[0].title).toBe('Task 1');
    });
  });

  describe('handleTaskGet', () => {
    it('should get task by id', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      const createResult = await handleTaskCreate(
        { projectId, title: 'Test Task', description: 'Test description', ownerId: workerId, priority: 1 },
        adapter
      );
      const { taskId } = JSON.parse(createResult.content[0].text);

      const result = await handleTaskGet({ taskId }, adapter);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.taskId).toBe(taskId);
      expect(content.title).toBe('Test Task');
      expect(content.description).toBe('Test description');
      expect(content.priority).toBe(1);
    });

    it('should return error for missing taskId', async () => {
      const result = await handleTaskGet({}, adapter);

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });

    it('should return error for non-existent task', async () => {
      const result = await handleTaskGet(
        { taskId: 'non-existent-id' },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('NOT_FOUND');
    });
  });

  describe('handleTaskUpdate', () => {
    it('should update task title', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      const createResult = await handleTaskCreate(
        { projectId, title: 'Original Title', ownerId: workerId },
        adapter
      );
      const { taskId } = JSON.parse(createResult.content[0].text);

      const result = await handleTaskUpdate(
        { taskId, title: 'New Title' },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.title).toBe('New Title');
    });

    it('should update task priority', async () => {
      const { workerId, projectId } = await setupWorkerAndProject();

      const createResult = await handleTaskCreate(
        { projectId, title: 'Test Task', ownerId: workerId, priority: 2 },
        adapter
      );
      const { taskId } = JSON.parse(createResult.content[0].text);

      const result = await handleTaskUpdate(
        { taskId, priority: 1 },
        adapter
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.priority).toBe(1);
    });

    it('should return error for missing taskId', async () => {
      const result = await handleTaskUpdate({}, adapter);

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('INVALID_INPUT');
    });

    it('should return error for non-existent task', async () => {
      const result = await handleTaskUpdate(
        { taskId: 'non-existent-id', title: 'New Title' },
        adapter
      );

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.error).toBe('NOT_FOUND');
    });
  });
});
