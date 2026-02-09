import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Worker,
  DomainError,
} from '../../schemas/index.js';

export interface ListWorkersOutput {
  workers: Worker[];
}

/**
 * List workers use case
 * Returns all workers (no filtering in v3)
 */
export async function listWorkersUseCase(
  _ctx: ExecutionContext,
  _input: Record<string, never>,
  adapter: StorageAdapter
): Promise<Result<ListWorkersOutput, DomainError>> {
  const workersResult = await adapter.listWorkers();
  if (workersResult.isErr()) {
    return err(workersResult.error);
  }

  return ok({ workers: workersResult.value });
}
