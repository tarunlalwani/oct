import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Project,
  CreateProjectInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';
import { generateUUID } from '../../utils/uuid.js';

export interface CreateProjectOutput {
  project: Project;
}

/**
 * Create project use case
 * Requires: project:create permission
 * Validates parent project exists if parentId provided
 */
export async function createProjectUseCase(
  ctx: ExecutionContext,
  input: CreateProjectInput,
  adapter: StorageAdapter
): Promise<Result<CreateProjectOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.PROJECT_CREATE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.PROJECT_CREATE}`, false));
  }

  // Validate parent project if provided
  if (input.parentId) {
    const parentResult = await adapter.getProject(input.parentId);
    if (parentResult.isErr()) {
      return err(parentResult.error);
    }
    if (!parentResult.value) {
      return err(createError('NOT_FOUND', `Parent project not found: ${input.parentId}`, false));
    }
  }

  const now = new Date().toISOString();

  const project: Project = {
    projectId: generateUUID(),
    name: input.name,
    description: input.description,
    parentId: input.parentId ?? null,
    memberIds: input.memberIds,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  const saveResult = await adapter.saveProject(project);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ project });
}
