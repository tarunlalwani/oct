import { ok, type Result } from 'neverthrow';
import type { Task, TaskRepository, DomainError } from '../index.js';

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
    // Simple UUID v4-like generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Helper method for testing
  clear(): void {
    this.tasks.clear();
  }

  // Helper method for testing
  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  // Helper to seed data for tests
  seed(tasks: Task[]): void {
    for (const task of tasks) {
      this.tasks.set(task.taskId, task);
    }
  }
}
