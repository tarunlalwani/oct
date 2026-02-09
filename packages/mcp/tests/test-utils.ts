import { ok, type Result } from 'neverthrow';
import type {
  StorageAdapter,
  Project,
  Worker,
  Task,
  DomainError,
  ProjectFilter,
  TaskFilter,
} from '@oct/core';

/**
 * In-memory storage adapter for testing MCP tools
 * Uses v3 schema (Worker instead of Employee)
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private projects: Map<string, Project> = new Map();
  private workers: Map<string, Worker> = new Map();
  private tasks: Map<string, Task> = new Map();

  // Workers
  async getWorker(id: string): Promise<Result<Worker | null, DomainError>> {
    return ok(this.workers.get(id) ?? null);
  }

  async saveWorker(worker: Worker): Promise<Result<void, DomainError>> {
    this.workers.set(worker.workerId, { ...worker });
    return ok(undefined);
  }

  async deleteWorker(id: string): Promise<Result<void, DomainError>> {
    this.workers.delete(id);
    return ok(undefined);
  }

  async listWorkers(): Promise<Result<Worker[], DomainError>> {
    return ok(Array.from(this.workers.values()));
  }

  // Projects
  async getProject(id: string): Promise<Result<Project | null, DomainError>> {
    return ok(this.projects.get(id) ?? null);
  }

  async saveProject(project: Project): Promise<Result<void, DomainError>> {
    this.projects.set(project.projectId, { ...project });
    return ok(undefined);
  }

  async deleteProject(id: string): Promise<Result<void, DomainError>> {
    this.projects.delete(id);
    return ok(undefined);
  }

  async listProjects(filter?: ProjectFilter): Promise<Result<Project[], DomainError>> {
    let projects = Array.from(this.projects.values());

    if (filter?.parentId !== undefined) {
      projects = projects.filter(p => p.parentId === filter.parentId);
    }

    if (filter?.status !== undefined) {
      projects = projects.filter(p => p.status === filter.status);
    }

    return ok(projects);
  }

  async getSubProjects(parentId: string): Promise<Result<Project[], DomainError>> {
    const projects = Array.from(this.projects.values()).filter(p => p.parentId === parentId);
    return ok(projects);
  }

  // Tasks
  async getTask(id: string): Promise<Result<Task | null, DomainError>> {
    return ok(this.tasks.get(id) ?? null);
  }

  async saveTask(task: Task): Promise<Result<void, DomainError>> {
    this.tasks.set(task.taskId, { ...task });
    return ok(undefined);
  }

  async deleteTask(id: string): Promise<Result<void, DomainError>> {
    this.tasks.delete(id);
    return ok(undefined);
  }

  async listTasks(filter?: TaskFilter): Promise<Result<Task[], DomainError>> {
    let tasks = Array.from(this.tasks.values());

    if (filter?.projectId !== undefined) {
      tasks = tasks.filter(t => t.projectId === filter.projectId);
    }

    if (filter?.ownerId !== undefined) {
      tasks = tasks.filter(t => t.ownerId === filter.ownerId);
    }

    if (filter?.status !== undefined) {
      tasks = tasks.filter(t => t.status === filter.status);
    }

    if (filter?.priority !== undefined) {
      tasks = tasks.filter(t => t.priority === filter.priority);
    }

    return ok(tasks);
  }

  // Optimized queries
  async getTasksByProject(projectId: string): Promise<Result<Task[], DomainError>> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
    return ok(tasks);
  }

  async getTasksByOwner(workerId: string): Promise<Result<Task[], DomainError>> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.ownerId === workerId);
    return ok(tasks);
  }

  // Batch operations
  async getTasksByIds(ids: string[]): Promise<Result<Map<string, Task>, DomainError>> {
    const tasks = new Map<string, Task>();

    for (const id of ids) {
      const task = this.tasks.get(id);
      if (task) {
        tasks.set(id, task);
      }
    }

    return ok(tasks);
  }

  // Helper methods for testing
  clear(): void {
    this.projects.clear();
    this.workers.clear();
    this.tasks.clear();
  }

  seedProject(project: Project): void {
    this.projects.set(project.projectId, project);
  }

  seedWorker(worker: Worker): void {
    this.workers.set(worker.workerId, worker);
  }

  seedTask(task: Task): void {
    this.tasks.set(task.taskId, task);
  }
}
