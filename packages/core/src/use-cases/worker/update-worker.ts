import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Worker,
  UpdateWorkerInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface UpdateWorkerOutput {
  worker: Worker;
}

/**
 * Update worker use case
 * Requires: worker:update permission
 */
export async function updateWorkerUseCase(
  ctx: ExecutionContext,
  input: UpdateWorkerInput,
  adapter: StorageAdapter
): Promise<Result<UpdateWorkerOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.WORKER_UPDATE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.WORKER_UPDATE}`, false));
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

  // Apply updates
  const updatedWorker: Worker = {
    ...existingWorker,
    name: input.name ?? existingWorker.name,
    roles: input.roles ?? existingWorker.roles,
    permissions: input.permissions ?? existingWorker.permissions,
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveWorker(updatedWorker);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ worker: updatedWorker });
}
