import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface GetReadyTasksInput {
  projectId?: string;
}

export interface GetReadyTasksOutput {
  tasks: Task[];
}

/**
 * Get ready tasks use case
 * Returns tasks that can be started (status = 'ready')
 * Requires: task:read permission
 */
export async function getReadyTasksUseCase(
  ctx: ExecutionContext,
  input: GetReadyTasksInput,
  adapter: StorageAdapter
): Promise<Result<GetReadyTasksOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_READ}`, false));
  }

  const filter = input.projectId
    ? { projectId: input.projectId, status: 'ready' as const }
    : { status: 'ready' as const };

  const result = await adapter.listTasks(filter);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok({ tasks: result.value });
}
