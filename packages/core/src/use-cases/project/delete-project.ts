import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export interface DeleteProjectInput {
  projectId: string;
}

export async function deleteProjectUseCase(
  ctx: ExecutionContext,
  input: DeleteProjectInput,
  adapter: StorageAdapter
): Promise<Result<void, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('project:delete')) {
    return err(createError('FORBIDDEN', 'Missing permission: project:delete', false));
  }

  // Get existing project
  const projectResult = await adapter.getProject(input.projectId);
  if (projectResult.isErr()) return err(projectResult.error);
  if (!projectResult.value) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  // Check for sub-projects
  const subProjectsResult = await adapter.getSubProjects(input.projectId);
  if (subProjectsResult.isErr()) return err(subProjectsResult.error);
  if (subProjectsResult.value.length > 0) {
    return err(createError('CONFLICT', `Cannot delete project with ${subProjectsResult.value.length} sub-projects`, false));
  }

  // Check for tasks
  const tasksResult = await adapter.getTasksByProject(input.projectId);
  if (tasksResult.isErr()) return err(tasksResult.error);
  if (tasksResult.value.length > 0) {
    return err(createError('CONFLICT', `Cannot delete project with ${tasksResult.value.length} tasks`, false));
  }

  const deleteResult = await adapter.deleteProject(input.projectId);
  if (deleteResult.isErr()) {
    return err(deleteResult.error);
  }

  return ok(undefined);
}
