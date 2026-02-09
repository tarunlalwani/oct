import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Project,
  ArchiveProjectInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface ArchiveProjectOutput {
  project: Project;
}

/**
 * Archive project use case
 * Requires: project:update permission
 * Archives project and all sub-projects recursively
 * Project must have no incomplete tasks
 */
export async function archiveProjectUseCase(
  ctx: ExecutionContext,
  input: ArchiveProjectInput,
  adapter: StorageAdapter
): Promise<Result<ArchiveProjectOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization (using update permission for archive)
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

  // Check for incomplete tasks
  const tasksResult = await adapter.getTasksByProject(input.projectId);
  if (tasksResult.isErr()) {
    return err(tasksResult.error);
  }

  const incompleteTasks = tasksResult.value.filter(t => t.status !== 'done');
  if (incompleteTasks.length > 0) {
    return err(createError('CONFLICT', `Cannot archive project with ${incompleteTasks.length} incomplete tasks`, false));
  }

  const now = new Date().toISOString();

  // Archive sub-projects recursively
  const subProjectsResult = await adapter.getSubProjects(input.projectId);
  if (subProjectsResult.isErr()) {
    return err(subProjectsResult.error);
  }

  for (const subProject of subProjectsResult.value) {
    if (subProject.status !== 'archived') {
      const archiveResult = await adapter.saveProject({
        ...subProject,
        status: 'archived',
        updatedAt: now,
      });
      if (archiveResult.isErr()) {
        return err(archiveResult.error);
      }
    }
  }

  // Archive the project itself
  const updatedProject: Project = {
    ...project,
    status: 'archived',
    updatedAt: now,
  };

  const saveResult = await adapter.saveProject(updatedProject);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ project: updatedProject });
}
