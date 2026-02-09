import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Project,
  AddProjectMemberInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface AddProjectMemberOutput {
  project: Project;
}

/**
 * Add project member use case
 * Requires: project:manage-members permission
 */
export async function addProjectMemberUseCase(
  ctx: ExecutionContext,
  input: AddProjectMemberInput,
  adapter: StorageAdapter
): Promise<Result<AddProjectMemberOutput, DomainError>> {
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

  // Verify worker exists
  const workerResult = await adapter.getWorker(input.workerId);
  if (workerResult.isErr()) {
    return err(workerResult.error);
  }

  if (!workerResult.value) {
    return err(createError('NOT_FOUND', `Worker not found: ${input.workerId}`, false));
  }

  // Check if already a member
  if (project.memberIds.includes(input.workerId)) {
    return err(createError('CONFLICT', `Worker ${input.workerId} is already a member of this project`, false));
  }

  const updatedProject: Project = {
    ...project,
    memberIds: [...project.memberIds, input.workerId],
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveProject(updatedProject);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ project: updatedProject });
}
