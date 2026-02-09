import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Project,
  ListProjectsFilter,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface ListProjectsInput {
  filter?: ListProjectsFilter;
}

export interface ListProjectsOutput {
  projects: Project[];
}

/**
 * List projects use case
 * Requires: project:read permission
 */
export async function listProjectsUseCase(
  ctx: ExecutionContext,
  input: ListProjectsInput,
  adapter: StorageAdapter
): Promise<Result<ListProjectsOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.PROJECT_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.PROJECT_READ}`, false));
  }

  const filter = input.filter ?? {};

  const result = await adapter.listProjects(filter);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok({ projects: result.value });
}
