import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface GetTaskInput {
  taskId: string;
}

export interface GetTaskOutput {
  task: Task;
}

/**
 * Get task use case
 * Requires: task:read permission
 */
export async function getTaskUseCase(
  ctx: ExecutionContext,
  input: GetTaskInput,
  adapter: StorageAdapter
): Promise<Result<GetTaskOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_READ}`, false));
  }

  const taskResult = await adapter.getTask(input.taskId);
  if (taskResult.isErr()) {
    return err(taskResult.error);
  }

  if (!taskResult.value) {
    return err(createError('NOT_FOUND', `Task not found: ${input.taskId}`, false));
  }

  return ok({ task: taskResult.value });
}
