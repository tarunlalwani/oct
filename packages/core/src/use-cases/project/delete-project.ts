import { err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  DeleteProjectInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

/**
 * Delete project use case
 * Requires: project:delete permission
 * Project must be archived and have no tasks or sub-projects
 */
export async function deleteProjectUseCase(
  ctx: ExecutionContext,
  input: DeleteProjectInput,
  adapter: StorageAdapter
): Promise<Result<void, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.PROJECT_DELETE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.PROJECT_DELETE}`, false));
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

  // Must be archived to delete
  if (project.status !== 'archived') {
    return err(createError('CONFLICT', 'Cannot delete non-archived project. Archive it first.', false));
  }

  // Check for sub-projects
  const subProjectsResult = await adapter.getSubProjects(input.projectId);
  if (subProjectsResult.isErr()) {
    return err(subProjectsResult.error);
  }

  if (subProjectsResult.value.length > 0) {
    return err(createError('CONFLICT', `Cannot delete project with ${subProjectsResult.value.length} sub-projects`, false));
  }

  // Check for tasks
  const tasksResult = await adapter.getTasksByProject(input.projectId);
  if (tasksResult.isErr()) {
    return err(tasksResult.error);
  }

  if (tasksResult.value.length > 0) {
    return err(createError('CONFLICT', `Cannot delete project with ${tasksResult.value.length} tasks`, false));
  }

  return await adapter.deleteProject(input.projectId);
}
