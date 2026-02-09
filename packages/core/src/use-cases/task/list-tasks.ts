import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  ListTasksFilter,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface ListTasksInput {
  filter?: ListTasksFilter;
}

export interface ListTasksOutput {
  tasks: Task[];
}

/**
 * List tasks use case
 * Requires: task:read permission
 */
export async function listTasksUseCase(
  ctx: ExecutionContext,
  input: ListTasksInput,
  adapter: StorageAdapter
): Promise<Result<ListTasksOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_READ}`, false));
  }

  const filter = input.filter ?? {};

  const result = await adapter.listTasks(filter);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok({ tasks: result.value });
}
