import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../schemas/context.js';
import type { GetTaskInput, GetTaskOutput } from '../schemas/use-cases.js';
import type { DomainError } from '../schemas/error.js';
import { createError } from '../schemas/error.js';
import type { TaskRepository } from '../ports/task-repository.js';

export async function getTaskUseCase(
  ctx: ExecutionContext,
  input: GetTaskInput,
  repository: TaskRepository
): Promise<Result<GetTaskOutput, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('task:read')) {
    return err(createError('FORBIDDEN', 'Missing permission: task:read', false));
  }

  // Validate input
  if (!input.taskId || input.taskId.trim().length === 0) {
    return err(createError('INVALID_INPUT', 'taskId is required', false));
  }

  const getResult = await repository.get(input.taskId);
  if (getResult.isErr()) {
    return err(getResult.error);
  }

  const task = getResult.value;
  if (!task) {
    return err(createError('NOT_FOUND', `Task not found: ${input.taskId}`, false));
  }

  return ok({ task });
}
