import { ok, type Result } from 'neverthrow';
import type { Task, TaskRepository, DomainError } from '@oct/core';
import { generateUUIDv7 } from '../utils/uuidv7.js';

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();

  async get(id: string): Promise<Result<Task | null, DomainError>> {
    const task = this.tasks.get(id);
    return ok(task ?? null);
  }

  async save(task: Task): Promise<Result<void, DomainError>> {
    this.tasks.set(task.taskId, { ...task });
    return ok(undefined);
  }

  async list(params: { limit?: number; cursor?: string }): Promise<Result<{ items: Task[]; nextCursor?: string }, DomainError>> {
    const allTasks = Array.from(this.tasks.values());

    // Sort by createdAt descending
    allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let startIndex = 0;
    if (params.cursor) {
      const cursorIndex = allTasks.findIndex(t => t.taskId === params.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const limit = params.limit ?? 50;
    const items = allTasks.slice(startIndex, startIndex + limit);

    const nextCursor = items.length === limit && items.length > 0
      ? items[items.length - 1].taskId
      : undefined;

    return ok({ items, nextCursor });
  }

  generateId(): string {
    return generateUUIDv7();
  }

  // Helper method for testing
  clear(): void {
    this.tasks.clear();
  }

  // Helper method for testing
  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }
}

export class InMemoryTaskRepositoryFactory {
  private repositories: Map<string, InMemoryTaskRepository> = new Map();

  createRepository(workspaceId: string): InMemoryTaskRepository {
    let repo = this.repositories.get(workspaceId);
    if (!repo) {
      repo = new InMemoryTaskRepository();
      this.repositories.set(workspaceId, repo);
    }
    return repo;
  }

  clearAll(): void {
    this.repositories.clear();
  }
}
