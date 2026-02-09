import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { StorageAdapter, Worker, Project, Task } from '@oct/core';
import { ok } from '@oct/core';
import { taskRoutes } from './tasks.js';

// Simple in-memory storage adapter for testing
class TestStorageAdapter implements StorageAdapter {
  private workers: Map<string, Worker> = new Map();
  private projects: Map<string, Project> = new Map();
  private tasks: Map<string, Task> = new Map();

  async getWorker(id: string): Promise<ReturnType<StorageAdapter['getWorker']>> {
    return ok(this.workers.get(id) ?? null);
  }
  async saveWorker(worker: Worker): Promise<ReturnType<StorageAdapter['saveWorker']>> {
    this.workers.set(worker.workerId, worker);
    return ok(undefined);
  }
  async deleteWorker(id: string): Promise<ReturnType<StorageAdapter['deleteWorker']>> {
    this.workers.delete(id);
    return ok(undefined);
  }
  async listWorkers(): Promise<ReturnType<StorageAdapter['listWorkers']>> {
    return ok(Array.from(this.workers.values()));
  }

  async getProject(id: string): Promise<ReturnType<StorageAdapter['getProject']>> {
    return ok(this.projects.get(id) ?? null);
  }
  async saveProject(project: Project): Promise<ReturnType<StorageAdapter['saveProject']>> {
    this.projects.set(project.projectId, project);
    return ok(undefined);
  }
  async deleteProject(id: string): Promise<ReturnType<StorageAdapter['deleteProject']>> {
    this.projects.delete(id);
    return ok(undefined);
  }
  async listProjects(filter?: { status?: string; parentId?: string | null }): Promise<ReturnType<StorageAdapter['listProjects']>> {
    let projects = Array.from(this.projects.values());
    if (filter?.status) projects = projects.filter(p => p.status === filter.status);
    if (filter?.parentId !== undefined) projects = projects.filter(p => p.parentId === filter.parentId);
    return ok(projects);
  }
  async getSubProjects(parentId: string): Promise<ReturnType<StorageAdapter['getSubProjects']>> {
    return ok(Array.from(this.projects.values()).filter(p => p.parentId === parentId));
  }

  async getTask(id: string): Promise<ReturnType<StorageAdapter['getTask']>> {
    return ok(this.tasks.get(id) ?? null);
  }
  async saveTask(task: Task): Promise<ReturnType<StorageAdapter['saveTask']>> {
    this.tasks.set(task.taskId, task);
    return ok(undefined);
  }
  async deleteTask(id: string): Promise<ReturnType<StorageAdapter['deleteTask']>> {
    this.tasks.delete(id);
    return ok(undefined);
  }
  async listTasks(filter?: { projectId?: string; ownerId?: string; status?: string; priority?: number }): Promise<ReturnType<StorageAdapter['listTasks']>> {
    let tasks = Array.from(this.tasks.values());
    if (filter?.projectId) tasks = tasks.filter(t => t.projectId === filter.projectId);
    if (filter?.ownerId) tasks = tasks.filter(t => t.ownerId === filter.ownerId);
    if (filter?.status) tasks = tasks.filter(t => t.status === filter.status);
    if (filter?.priority !== undefined) tasks = tasks.filter(t => t.priority === filter.priority);
    return ok(tasks);
  }
  async getTasksByProject(projectId: string): Promise<ReturnType<StorageAdapter['getTasksByProject']>> {
    return ok(Array.from(this.tasks.values()).filter(t => t.projectId === projectId));
  }
  async getTasksByOwner(workerId: string): Promise<ReturnType<StorageAdapter['getTasksByOwner']>> {
    return ok(Array.from(this.tasks.values()).filter(t => t.ownerId === workerId));
  }
  async getTasksByIds(ids: string[]): Promise<ReturnType<StorageAdapter['getTasksByIds']>> {
    const map = new Map<string, Task>();
    for (const id of ids) {
      const task = this.tasks.get(id);
      if (task) map.set(id, task);
    }
    return ok(map);
  }

  clear(): void {
    this.workers.clear();
    this.projects.clear();
    this.tasks.clear();
  }
}

describe('Task Routes', () => {
  let fastify: ReturnType<typeof Fastify>;
  let storageAdapter: StorageAdapter;

  beforeEach(() => {
    fastify = Fastify();
    storageAdapter = new TestStorageAdapter();
    fastify.register(taskRoutes, { storageAdapter });
  });

  const authHeaders = {
    'x-actor-id': 'test-user',
    'x-permissions': 'task:create,task:read,task:update,task:delete,task:start,task:complete,task:reopen,task:assign,project:read,worker:read',
  };

  const setupProjectAndWorker = async () => {
    await storageAdapter.saveProject({
      projectId: 'proj-1',
      name: 'Project One',
      description: '',
      parentId: null,
      memberIds: ['worker-1'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await storageAdapter.saveWorker({
      workerId: 'worker-1',
      name: 'Worker One',
      type: 'human',
      roles: [],
      permissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  describe('POST /api/v1/tasks', () => {
    it('should create a task', async () => {
      await setupProjectAndWorker();

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: authHeaders,
        payload: {
          projectId: 'proj-1',
          title: 'Test Task',
          ownerId: 'worker-1',
          priority: 2,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.task.title).toBe('Test Task');
    });

    it('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: {
          projectId: 'proj-1',
          title: 'Test Task',
          ownerId: 'worker-1',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: authHeaders,
        payload: {
          projectId: 'non-existent',
          title: 'Test Task',
          ownerId: 'worker-1',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should list tasks', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'backlog',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.tasks).toHaveLength(1);
    });

    it('should filter by projectId', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'backlog',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/tasks?projectId=proj-1',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.tasks).toHaveLength(1);
    });
  });

  describe('GET /api/v1/tasks/ready', () => {
    it('should return ready tasks', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'ready',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/tasks/ready',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.tasks).toHaveLength(1);
    });
  });

  describe('GET /api/v1/tasks/blocked', () => {
    it('should return blocked tasks with blockers', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Blocking Task',
        description: '',
        ownerId: 'worker-1',
        status: 'active',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await storageAdapter.saveTask({
        taskId: 'task-2',
        projectId: 'proj-1',
        title: 'Blocked Task',
        description: '',
        ownerId: 'worker-1',
        status: 'blocked',
        priority: 2,
        dependencies: ['task-1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/tasks/blocked',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.tasks).toHaveLength(1);
      expect(body.data.tasks[0].task.taskId).toBe('task-2');
      expect(body.data.tasks[0].blockers).toHaveLength(1);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should get a task by id', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'backlog',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/tasks/task-1',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.task.taskId).toBe('task-1');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/tasks/non-existent',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    it('should update a task', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'backlog',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/tasks/task-1',
        headers: authHeaders,
        payload: {
          title: 'Updated Task',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.task.title).toBe('Updated Task');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'backlog',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/v1/tasks/task-1',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('POST /api/v1/tasks/:id/start', () => {
    it('should start a ready task', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'test-user', // Same as actor
        status: 'ready',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/tasks/task-1/start',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.task.status).toBe('active');
    });

    it('should return 409 for non-ready task', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'test-user',
        status: 'backlog',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/tasks/task-1/start',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /api/v1/tasks/:id/complete', () => {
    it('should complete an active task', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'test-user',
        status: 'active',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/tasks/task-1/complete',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.task.status).toBe('review');
    });
  });

  describe('POST /api/v1/tasks/:id/reopen', () => {
    it('should reopen a done task', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'done',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const reopenHeaders = {
        'x-actor-id': 'test-user',
        'x-permissions': 'task:reopen,task:read',
      };

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/tasks/task-1/reopen',
        headers: reopenHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.task.status).toBe('ready');
    });
  });

  describe('POST /api/v1/tasks/:id/assign', () => {
    it('should assign task to worker', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'backlog',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create another worker
      await storageAdapter.saveWorker({
        workerId: 'worker-2',
        name: 'Worker Two',
        type: 'human',
        roles: [],
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update project to include worker-2
      await storageAdapter.saveProject({
        projectId: 'proj-1',
        name: 'Project One',
        description: '',
        parentId: null,
        memberIds: ['worker-1', 'worker-2'],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/tasks/task-1/assign',
        headers: authHeaders,
        payload: {
          workerId: 'worker-2',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.task.ownerId).toBe('worker-2');
    });
  });

  describe('GET /api/v1/projects/:id/stats', () => {
    it('should return project stats', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'done',
        priority: 1,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await storageAdapter.saveTask({
        taskId: 'task-2',
        projectId: 'proj-1',
        title: 'Task Two',
        description: '',
        ownerId: 'worker-1',
        status: 'active',
        priority: 2,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/projects/proj-1/stats',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.stats.totalTasks).toBe(2);
      expect(body.data.stats.tasksByStatus.done).toBe(1);
      expect(body.data.stats.tasksByStatus.active).toBe(1);
    });
  });

  describe('GET /api/v1/workers/:id/workload', () => {
    it('should return worker workload', async () => {
      await setupProjectAndWorker();
      await storageAdapter.saveTask({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task One',
        description: '',
        ownerId: 'worker-1',
        status: 'active',
        priority: 1,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/workers/worker-1/workload',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.workload.totalTasks).toBe(1);
      expect(body.data.workload.tasksByStatus.active).toBe(1);
    });
  });
});
