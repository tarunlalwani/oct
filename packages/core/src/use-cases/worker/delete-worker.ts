import { err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface DeleteWorkerInput {
  workerId: string;
}

/**
 * Delete worker use case
 * Requires: worker:delete permission
 * Worker must have no active tasks
 */
export async function deleteWorkerUseCase(
  ctx: ExecutionContext,
  input: DeleteWorkerInput,
  adapter: StorageAdapter
): Promise<Result<void, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.WORKER_DELETE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.WORKER_DELETE}`, false));
  }

  // Get existing worker
  const workerResult = await adapter.getWorker(input.workerId);
  if (workerResult.isErr()) {
    return err(workerResult.error);
  }

  const existingWorker = workerResult.value;
  if (!existingWorker) {
    return err(createError('NOT_FOUND', `Worker not found: ${input.workerId}`, false));
  }

  // Check for active tasks
  const tasksResult = await adapter.getTasksByOwner(input.workerId);
  if (tasksResult.isErr()) {
    return err(tasksResult.error);
  }

  const activeTasks = tasksResult.value.filter(
    (task) => task.status !== 'done'
  );

  if (activeTasks.length > 0) {
    return err(
      createError(
        'CONFLICT',
        `Cannot delete worker with active tasks. Reassign or complete ${activeTasks.length} task(s) first.`,
        false,
        { activeTaskCount: activeTasks.length }
      )
    );
  }

  return await adapter.deleteWorker(input.workerId);
}
