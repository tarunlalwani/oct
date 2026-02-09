import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { StorageAdapter, Worker, Project, Task } from '@oct/core';
import { ok } from '@oct/core';
import { projectRoutes } from './projects.js';

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

describe('Project Routes', () => {
  let fastify: ReturnType<typeof Fastify>;
  let storageAdapter: StorageAdapter;

  beforeEach(() => {
    fastify = Fastify();
    storageAdapter = new TestStorageAdapter();
    fastify.register(projectRoutes, { storageAdapter });
  });

  const authHeaders = {
    'x-actor-id': 'test-user',
    'x-permissions': 'project:create,project:read,project:update,project:delete,project:manage-members',
  };

  describe('POST /api/v1/projects', () => {
    it('should create a project', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders,
        payload: {
          name: 'Test Project',
          description: 'A test project',
          memberIds: [],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.project.name).toBe('Test Project');
      expect(body.data.project.projectId).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'Test Project',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 without permission', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          'x-actor-id': 'test-user',
          'x-permissions': 'task:read',
        },
        payload: {
          name: 'Test Project',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should list projects', async () => {
      await storageAdapter.saveProject({
        projectId: 'proj-1',
        name: 'Project One',
        description: '',
        parentId: null,
        memberIds: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.projects).toHaveLength(1);
    });

    it('should filter by status', async () => {
      await storageAdapter.saveProject({
        projectId: 'proj-1',
        name: 'Project One',
        description: '',
        parentId: null,
        memberIds: [],
        status: 'archived',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/projects?status=archived',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.projects).toHaveLength(1);
      expect(body.data.projects[0].status).toBe('archived');
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should get a project by id', async () => {
      await storageAdapter.saveProject({
        projectId: 'proj-1',
        name: 'Project One',
        description: '',
        parentId: null,
        memberIds: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/projects/proj-1',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.project.projectId).toBe('proj-1');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/projects/non-existent',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should update a project', async () => {
      await storageAdapter.saveProject({
        projectId: 'proj-1',
        name: 'Project One',
        description: '',
        parentId: null,
        memberIds: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/projects/proj-1',
        headers: authHeaders,
        payload: {
          name: 'Updated Project',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.project.name).toBe('Updated Project');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should return 409 for non-archived project', async () => {
      await storageAdapter.saveProject({
        projectId: 'proj-1',
        name: 'Project One',
        description: '',
        parentId: null,
        memberIds: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/v1/projects/proj-1',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /api/v1/projects/:id/archive', () => {
    it('should archive a project', async () => {
      await storageAdapter.saveProject({
        projectId: 'proj-1',
        name: 'Project One',
        description: '',
        parentId: null,
        memberIds: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/archive',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.project.status).toBe('archived');
    });
  });

  describe('POST /api/v1/projects/:id/members', () => {
    it('should add a member to project', async () => {
      await storageAdapter.saveProject({
        projectId: 'proj-1',
        name: 'Project One',
        description: '',
        parentId: null,
        memberIds: [],
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

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/members',
        headers: authHeaders,
        payload: {
          workerId: 'worker-1',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.project.memberIds).toContain('worker-1');
    });
  });

  describe('DELETE /api/v1/projects/:id/members/:workerId', () => {
    it('should remove a member from project', async () => {
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

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/v1/projects/proj-1/members/worker-1',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.project.memberIds).not.toContain('worker-1');
    });
  });
});
