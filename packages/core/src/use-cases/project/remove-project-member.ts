import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Project,
  RemoveProjectMemberInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface RemoveProjectMemberOutput {
  project: Project;
}

/**
 * Remove project member use case
 * Requires: project:manage-members permission
 * Worker must have no active tasks in the project
 */
export async function removeProjectMemberUseCase(
  ctx: ExecutionContext,
  input: RemoveProjectMemberInput,
  adapter: StorageAdapter
): Promise<Result<RemoveProjectMemberOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.PROJECT_MANAGE_MEMBERS)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.PROJECT_MANAGE_MEMBERS}`, false));
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

  // Cannot modify archived projects
  if (project.status === 'archived') {
    return err(createError('CONFLICT', 'Cannot modify archived project', false));
  }

  // Check if worker is a member
  if (!project.memberIds.includes(input.workerId)) {
    return err(createError('NOT_FOUND', `Worker ${input.workerId} is not a member of this project`, false));
  }

  // Check for active tasks assigned to this worker in the project
  const tasksResult = await adapter.getTasksByProject(input.projectId);
  if (tasksResult.isErr()) {
    return err(tasksResult.error);
  }

  const activeTasks = tasksResult.value.filter(
    (task) => task.ownerId === input.workerId && task.status !== 'done'
  );

  if (activeTasks.length > 0) {
    return err(
      createError(
        'CONFLICT',
        `Cannot remove worker with ${activeTasks.length} active task(s) in this project. Reassign or complete tasks first.`,
        false,
        { activeTaskCount: activeTasks.length }
      )
    );
  }

  const updatedProject: Project = {
    ...project,
    memberIds: project.memberIds.filter((id) => id !== input.workerId),
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveProject(updatedProject);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ project: updatedProject });
}
