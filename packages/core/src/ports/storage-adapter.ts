import type { Project } from '../schemas/project.js';
import type { Worker } from '../schemas/worker.js';
import type { Task, TaskStatus } from '../schemas/task.js';
import type { DomainError } from '../schemas/error.js';
import type { Result } from 'neverthrow';

/**
 * Filter types for list operations
 */
export interface ProjectFilter {
  status?: 'active' | 'archived';
  parentId?: string | null;
}

export interface TaskFilter {
  projectId?: string;
  ownerId?: string;
  status?: TaskStatus;
  priority?: number;
}

/**
 * Storage Adapter interface - v3
 * Unified interface for all persistence operations
 */
export interface StorageAdapter {
  // Workers
  getWorker(id: string): Promise<Result<Worker | null, DomainError>>;
  saveWorker(worker: Worker): Promise<Result<void, DomainError>>;
  deleteWorker(id: string): Promise<Result<void, DomainError>>;
  listWorkers(): Promise<Result<Worker[], DomainError>>;

  // Projects
  getProject(id: string): Promise<Result<Project | null, DomainError>>;
  saveProject(project: Project): Promise<Result<void, DomainError>>;
  deleteProject(id: string): Promise<Result<void, DomainError>>;
  listProjects(filter?: ProjectFilter): Promise<Result<Project[], DomainError>>;
  getSubProjects(parentId: string): Promise<Result<Project[], DomainError>>;

  // Tasks
  getTask(id: string): Promise<Result<Task | null, DomainError>>;
  saveTask(task: Task): Promise<Result<void, DomainError>>;
  deleteTask(id: string): Promise<Result<void, DomainError>>;
  listTasks(filter?: TaskFilter): Promise<Result<Task[], DomainError>>;

  // Optimized queries
  getTasksByProject(projectId: string): Promise<Result<Task[], DomainError>>;
  getTasksByOwner(workerId: string): Promise<Result<Task[], DomainError>>;

  // Batch operations for performance
  getTasksByIds(ids: string[]): Promise<Result<Map<string, Task>, DomainError>>;
}

/**
 * Storage Adapter Factory
 */
export interface StorageAdapterFactory {
  createAdapter(workspaceId: string): StorageAdapter;
}
