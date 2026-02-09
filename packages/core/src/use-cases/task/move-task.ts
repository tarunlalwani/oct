import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  MoveTaskInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface MoveTaskOutput {
  task: Task;
}

/**
 * Move task use case
 * Requires: task:update permission
 * Moves task to a different project
 */
export async function moveTaskUseCase(
  ctx: ExecutionContext,
  input: MoveTaskInput,
  adapter: StorageAdapter
): Promise<Result<MoveTaskOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_UPDATE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_UPDATE}`, false));
  }

  // Get existing task
  const taskResult = await adapter.getTask(input.taskId);
  if (taskResult.isErr()) {
    return err(taskResult.error);
  }

  const task = taskResult.value;
  if (!task) {
    return err(createError('NOT_FOUND', `Task not found: ${input.taskId}`, false));
  }

  // Get target project
  const projectResult = await adapter.getProject(input.newProjectId);
  if (projectResult.isErr()) {
    return err(projectResult.error);
  }

  const project = projectResult.value;
  if (!project) {
    return err(createError('NOT_FOUND', `Project not found: ${input.newProjectId}`, false));
  }

  // Cannot move to archived project
  if (project.status === 'archived') {
    return err(createError('CONFLICT', 'Cannot move tasks to archived project', false));
  }

  // Check if task owner is member of new project
  if (!project.memberIds.includes(task.ownerId)) {
    return err(createError('FORBIDDEN', 'Task owner must be a member of the target project', false));
  }

  const updatedTask: Task = {
    ...task,
    projectId: input.newProjectId,
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveTask(updatedTask);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task: updatedTask });
}
