import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Worker,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface GetWorkerInput {
  workerId: string;
}

export interface GetWorkerOutput {
  worker: Worker;
}

/**
 * Get worker use case
 * Requires: worker:read permission
 */
export async function getWorkerUseCase(
  ctx: ExecutionContext,
  input: GetWorkerInput,
  adapter: StorageAdapter
): Promise<Result<GetWorkerOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.WORKER_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.WORKER_READ}`, false));
  }

  const workerResult = await adapter.getWorker(input.workerId);
  if (workerResult.isErr()) {
    return err(workerResult.error);
  }

  const worker = workerResult.value;
  if (!worker) {
    return err(createError('NOT_FOUND', `Worker not found: ${input.workerId}`, false));
  }

  return ok({ worker });
}
