import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../schemas/context.js';
import type { ListTasksInput, ListTasksOutput } from '../schemas/use-cases.js';
import type { DomainError } from '../schemas/error.js';
import { createError } from '../schemas/error.js';
import type { TaskRepository } from '../ports/task-repository.js';

export async function listTasksUseCase(
  ctx: ExecutionContext,
  input: ListTasksInput,
  repository: TaskRepository
): Promise<Result<ListTasksOutput, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('task:read')) {
    return err(createError('FORBIDDEN', 'Missing permission: task:read', false));
  }

  const listResult = await repository.list({
    limit: input.limit,
    cursor: input.cursor,
  });

  if (listResult.isErr()) {
    return err(listResult.error);
  }

  return ok({
    items: listResult.value.items,
    nextCursor: listResult.value.nextCursor,
  });
}
