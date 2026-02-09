import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { StorageAdapter, Worker, Project, Task } from '@oct/core';
import { ok } from '@oct/core';
import { workerRoutes } from './workers.js';

// Simple in-memory storage adapter for testing
class TestStorageAdapter implements StorageAdapter {
  private workers: Map<string, Worker> = new Map();
  private projects: Map<string, Project> = new Map();
  private tasks: Map<string, Task> = new Map();

  async getWorker(id: string) {
    return ok(this.workers.get(id) ?? null);
  }
  async saveWorker(worker: Worker) {
    this.workers.set(worker.workerId, worker);
    return ok(undefined);
  }
  async deleteWorker(id: string) {
    this.workers.delete(id);
    return ok(undefined);
  }
  async listWorkers() {
    return ok(Array.from(this.workers.values()));
  }

  async getProject(id: string) {
    return ok(this.projects.get(id) ?? null);
  }
  async saveProject(project: Project) {
    this.projects.set(project.projectId, project);
    return ok(undefined);
  }
  async deleteProject(id: string) {
    this.projects.delete(id);
    return ok(undefined);
  }
  async listProjects(filter?: { status?: string; parentId?: string | null }) {
    let projects = Array.from(this.projects.values());
    if (filter?.status) projects = projects.filter(p => p.status === filter.status);
    if (filter?.parentId !== undefined) projects = projects.filter(p => p.parentId === filter.parentId);
    return ok(projects);
  }
  async getSubProjects(parentId: string) {
    return ok(Array.from(this.projects.values()).filter(p => p.parentId === parentId));
  }

  async getTask(id: string) {
    return ok(this.tasks.get(id) ?? null);
  }
  async saveTask(task: Task) {
    this.tasks.set(task.taskId, task);
    return ok(undefined);
  }
  async deleteTask(id: string) {
    this.tasks.delete(id);
    return ok(undefined);
  }
  async listTasks(filter?: { projectId?: string; ownerId?: string; status?: string; priority?: number }) {
    let tasks = Array.from(this.tasks.values());
    if (filter?.projectId) tasks = tasks.filter(t => t.projectId === filter.projectId);
    if (filter?.ownerId) tasks = tasks.filter(t => t.ownerId === filter.ownerId);
    if (filter?.status) tasks = tasks.filter(t => t.status === filter.status);
    if (filter?.priority !== undefined) tasks = tasks.filter(t => t.priority === filter.priority);
    return ok(tasks);
  }
  async getTasksByProject(projectId: string) {
    return ok(Array.from(this.tasks.values()).filter(t => t.projectId === projectId));
  }
  async getTasksByOwner(workerId: string) {
    return ok(Array.from(this.tasks.values()).filter(t => t.ownerId === workerId));
  }
  async getTasksByIds(ids: string[]) {
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

describe('Worker Routes', () => {
  let fastify: ReturnType<typeof Fastify>;
  let storageAdapter: StorageAdapter;

  beforeEach(() => {
    fastify = Fastify();
    storageAdapter = new TestStorageAdapter();
    fastify.register(workerRoutes, { storageAdapter });
  });

  const authHeaders = {
    'x-actor-id': 'test-user',
    'x-permissions': 'worker:create,worker:read,worker:update,worker:delete',
  };

  describe('POST /api/v1/workers', () => {
    it('should create a worker', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/workers',
        headers: authHeaders,
        payload: {
          name: 'Test Worker',
          type: 'human',
          roles: ['developer'],
          permissions: ['task:read'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.worker.name).toBe('Test Worker');
      expect(body.data.worker.workerId).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/workers',
        payload: {
          name: 'Test Worker',
          type: 'human',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 without permission', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/workers',
        headers: {
          'x-actor-id': 'test-user',
          'x-permissions': 'task:read',
        },
        payload: {
          name: 'Test Worker',
          type: 'human',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid input', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/workers',
        headers: authHeaders,
        payload: {
          name: '', // Invalid: empty name
          type: 'human',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/workers', () => {
    it('should list workers', async () => {
      // Create a worker first
      await storageAdapter.saveWorker({
        workerId: 'worker-1',
        name: 'Worker One',
        type: 'human',
        roles: [],
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/workers',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.workers).toHaveLength(1);
      expect(body.data.workers[0].name).toBe('Worker One');
    });

    it('should return empty array when no workers', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/workers',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.workers).toEqual([]);
    });
  });

  describe('GET /api/v1/workers/:id', () => {
    it('should get a worker by id', async () => {
      await storageAdapter.saveWorker({
        workerId: 'worker-1',
        name: 'Worker One',
        type: 'human',
        roles: [],
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/workers/worker-1',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.worker.workerId).toBe('worker-1');
    });

    it('should return 404 for non-existent worker', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/workers/non-existent',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/workers/:id', () => {
    it('should update a worker', async () => {
      await storageAdapter.saveWorker({
        workerId: 'worker-1',
        name: 'Worker One',
        type: 'human',
        roles: [],
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/workers/worker-1',
        headers: authHeaders,
        payload: {
          name: 'Updated Worker',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.worker.name).toBe('Updated Worker');
    });

    it('should return 404 for non-existent worker', async () => {
      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/workers/non-existent',
        headers: authHeaders,
        payload: {
          name: 'Updated Worker',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/workers/:id', () => {
    it('should delete a worker', async () => {
      await storageAdapter.saveWorker({
        workerId: 'worker-1',
        name: 'Worker One',
        type: 'human',
        roles: [],
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/v1/workers/worker-1',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 404 for non-existent worker', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/v1/workers/non-existent',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
