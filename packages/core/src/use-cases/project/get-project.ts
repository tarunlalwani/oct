import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Project,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface GetProjectInput {
  projectId: string;
}

export interface GetProjectOutput {
  project: Project;
}

/**
 * Get project use case
 * Requires: project:read permission
 */
export async function getProjectUseCase(
  ctx: ExecutionContext,
  input: GetProjectInput,
  adapter: StorageAdapter
): Promise<Result<GetProjectOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.PROJECT_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.PROJECT_READ}`, false));
  }

  const result = await adapter.getProject(input.projectId);
  if (result.isErr()) {
    return err(result.error);
  }

  if (!result.value) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  return ok({ project: result.value });
}
