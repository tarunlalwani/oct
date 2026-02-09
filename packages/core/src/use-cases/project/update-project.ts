import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Project,
  UpdateProjectInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface UpdateProjectOutput {
  project: Project;
}

/**
 * Update project use case
 * Requires: project:update permission
 */
export async function updateProjectUseCase(
  ctx: ExecutionContext,
  input: UpdateProjectInput,
  adapter: StorageAdapter
): Promise<Result<UpdateProjectOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.PROJECT_UPDATE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.PROJECT_UPDATE}`, false));
  }

  // Get existing project
  const projectResult = await adapter.getProject(input.projectId);
  if (projectResult.isErr()) {
    return err(projectResult.error);
  }

  const project = projectResult.value;
  if (!project) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  // Cannot update archived projects
  if (project.status === 'archived') {
    return err(createError('CONFLICT', 'Cannot update archived project', false));
  }

  const updatedProject: Project = {
    ...project,
    name: input.name ?? project.name,
    description: input.description ?? project.description,
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveProject(updatedProject);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ project: updatedProject });
}
