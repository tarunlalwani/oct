import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Worker,
  CreateWorkerInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';
import { generateUUID } from '../../utils/uuid.js';

export interface CreateWorkerOutput {
  worker: Worker;
}

/**
 * Create worker use case
 * Requires: worker:create permission
 */
export async function createWorkerUseCase(
  ctx: ExecutionContext,
  input: CreateWorkerInput,
  adapter: StorageAdapter
): Promise<Result<CreateWorkerOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.WORKER_CREATE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.WORKER_CREATE}`, false));
  }

  const now = new Date().toISOString();

  const worker: Worker = {
    workerId: generateUUID(),
    name: input.name,
    type: input.type,
    roles: input.roles,
    permissions: input.permissions,
    createdAt: now,
    updatedAt: now,
  };

  const saveResult = await adapter.saveWorker(worker);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ worker });
}
