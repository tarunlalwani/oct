import { promises as fs } from 'fs';
import path from 'path';
import { ok, err, type Result } from 'neverthrow';
import type {
  StorageAdapter,
  Project,
  Worker,
  Task,
  DomainError,
  ProjectFilter,
  TaskFilter,
} from '@oct/core';
import { createError } from '@oct/core';

export interface FileSystemStorageConfig {
  dbRoot: string;
}

export class FileSystemStorageAdapter implements StorageAdapter {
  private dbRoot: string;
  private workersDir: string;
  private projectsDir: string;
  private tasksDir: string;

  constructor(config: FileSystemStorageConfig) {
    this.dbRoot = config.dbRoot;
    this.workersDir = path.join(this.dbRoot, 'workers');
    this.projectsDir = path.join(this.dbRoot, 'projects');
    this.tasksDir = path.join(this.dbRoot, 'tasks');
  }

  async initialize(): Promise<Result<void, DomainError>> {
    try {
      await fs.mkdir(this.workersDir, { recursive: true });
      await fs.mkdir(this.projectsDir, { recursive: true });
      await fs.mkdir(this.tasksDir, { recursive: true });
      return ok(undefined);
    } catch (error) {
      return err(createError('INTERNAL_ERROR', `Failed to initialize storage: ${error}`, false));
    }
  }

  // Workers
  async getWorker(id: string): Promise<Result<Worker | null, DomainError>> {
    return this.readEntity<Worker>(this.workersDir, id);
  }

  async saveWorker(worker: Worker): Promise<Result<void, DomainError>> {
    return this.writeEntity(this.workersDir, worker.workerId, worker);
  }

  async deleteWorker(id: string): Promise<Result<void, DomainError>> {
    return this.deleteEntity(this.workersDir, id);
  }

  async listWorkers(): Promise<Result<Worker[], DomainError>> {
    return this.listEntities<Worker>(this.workersDir);
  }

  // Projects
  async getProject(id: string): Promise<Result<Project | null, DomainError>> {
    return this.readEntity<Project>(this.projectsDir, id);
  }

  async saveProject(project: Project): Promise<Result<void, DomainError>> {
    return this.writeEntity(this.projectsDir, project.projectId, project);
  }

  async deleteProject(id: string): Promise<Result<void, DomainError>> {
    return this.deleteEntity(this.projectsDir, id);
  }

  async listProjects(filter?: ProjectFilter): Promise<Result<Project[], DomainError>> {
    const result = await this.listEntities<Project>(this.projectsDir);
    if (result.isErr()) return err(result.error);

    let projects = result.value;

    if (filter?.parentId !== undefined) {
      projects = projects.filter(p => p.parentId === filter.parentId);
    }

    if (filter?.status !== undefined) {
      projects = projects.filter(p => p.status === filter.status);
    }

    return ok(projects);
  }

  async getSubProjects(parentId: string): Promise<Result<Project[], DomainError>> {
    return this.listProjects({ parentId });
  }

  // Tasks
  async getTask(id: string): Promise<Result<Task | null, DomainError>> {
    return this.readEntity<Task>(this.tasksDir, id);
  }

  async saveTask(task: Task): Promise<Result<void, DomainError>> {
    return this.writeEntity(this.tasksDir, task.taskId, task);
  }

  async deleteTask(id: string): Promise<Result<void, DomainError>> {
    return this.deleteEntity(this.tasksDir, id);
  }

  async listTasks(filter?: TaskFilter): Promise<Result<Task[], DomainError>> {
    const result = await this.listEntities<Task>(this.tasksDir);
    if (result.isErr()) return err(result.error);

    let tasks = result.value;

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
    return this.listTasks({ projectId });
  }

  async getTasksByOwner(workerId: string): Promise<Result<Task[], DomainError>> {
    return this.listTasks({ ownerId: workerId });
  }

  // Batch operations
  async getTasksByIds(ids: string[]): Promise<Result<Map<string, Task>, DomainError>> {
    const tasks = new Map<string, Task>();

    const results = await Promise.all(
      ids.map(async (id) => {
        const result = await this.getTask(id);
        return { id, result };
      })
    );

    for (const { id, result } of results) {
      if (result.isOk() && result.value) {
        tasks.set(id, result.value);
      }
    }

    return ok(tasks);
  }

  // Private helpers
  private async readEntity<T>(dir: string, id: string): Promise<Result<T | null, DomainError>> {
    const filePath = path.join(dir, `${id}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return ok(JSON.parse(content) as T);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return ok(null);
      }
      return err(createError('INTERNAL_ERROR', `Failed to read entity: ${error}`, false));
    }
  }

  private async writeEntity<T>(dir: string, id: string, entity: T): Promise<Result<void, DomainError>> {
    const filePath = path.join(dir, `${id}.json`);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tempPath, JSON.stringify(entity, null, 2));
      await fs.rename(tempPath, filePath);
      return ok(undefined);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      return err(createError('INTERNAL_ERROR', `Failed to write entity: ${error}`, false));
    }
  }

  private async deleteEntity(dir: string, id: string): Promise<Result<void, DomainError>> {
    const filePath = path.join(dir, `${id}.json`);
    try {
      await fs.unlink(filePath);
      return ok(undefined);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return err(createError('NOT_FOUND', `Entity not found: ${id}`, false));
      }
      return err(createError('INTERNAL_ERROR', `Failed to delete entity: ${error}`, false));
    }
  }

  private async listEntities<T>(dir: string): Promise<Result<T[], DomainError>> {
    try {
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const entities: T[] = [];

      for (const file of jsonFiles) {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        entities.push(JSON.parse(content) as T);
      }

      return ok(entities);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return ok([]);
      }
      return err(createError('INTERNAL_ERROR', `Failed to list entities: ${error}`, false));
    }
  }
}
