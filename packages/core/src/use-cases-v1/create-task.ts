import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../schemas/context.js';
import type { CreateTaskInput, CreateTaskOutput } from '../schemas/use-cases.js';
import type { DomainError } from '../schemas/error.js';
import { createError } from '../schemas/error.js';
import { createTask as createTaskEntity } from '../domain/task.js';
import type { TaskRepository } from '../ports/task-repository.js';

export async function createTaskUseCase(
  ctx: ExecutionContext,
  input: CreateTaskInput,
  repository: TaskRepository
): Promise<Result<CreateTaskOutput, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('task:create')) {
    return err(createError('FORBIDDEN', 'Missing permission: task:create', false));
  }

  // Validate input
  if (!input.title || input.title.trim().length === 0) {
    return err(createError('INVALID_INPUT', 'Title is required', false));
  }

  if (input.title.length > 256) {
    return err(createError('INVALID_INPUT', 'Title must be 256 characters or less', false));
  }

  const taskId = repository.generateId();
  const task = createTaskEntity({
    taskId,
    title: input.title.trim(),
    createdBy: ctx.actorId,
    description: input.description,
    metadata: input.metadata ?? undefined,
  });

  const saveResult = await repository.save(task);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task });
}
