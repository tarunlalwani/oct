import type { Task } from '../domain/task.js';
import type { DomainError } from '../schemas/error.js';
import type { Result } from 'neverthrow';

export interface TaskRepository {
  get(id: string): Promise<Result<Task | null, DomainError>>;
  save(task: Task): Promise<Result<void, DomainError>>;
  list(params: { limit?: number; cursor?: string }): Promise<Result<{ items: Task[]; nextCursor?: string }, DomainError>>;
  generateId(): string;
}

export interface TaskRepositoryFactory {
  createRepository(workspaceId: string): TaskRepository;
}
