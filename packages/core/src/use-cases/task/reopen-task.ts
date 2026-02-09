import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  ReopenTaskInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface ReopenTaskOutput {
  task: Task;
}

/**
 * Reopen task use case
 * Requires: task:reopen permission
 * Moves task from 'done' back to 'ready'
 */
export async function reopenTaskUseCase(
  ctx: ExecutionContext,
  input: ReopenTaskInput,
  adapter: StorageAdapter
): Promise<Result<ReopenTaskOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_REOPEN)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_REOPEN}`, false));
  }

  const taskResult = await adapter.getTask(input.taskId);
  if (taskResult.isErr()) {
    return err(taskResult.error);
  }

  if (!taskResult.value) {
    return err(createError('NOT_FOUND', `Task not found: ${input.taskId}`, false));
  }

  const task = taskResult.value;

  // Can only reopen from 'done' status
  if (task.status !== 'done') {
    return err(createError('CONFLICT', `Cannot reopen task with status: ${task.status}`, false));
  }

  // Get project to check if archived
  const projectResult = await adapter.getProject(task.projectId);
  if (projectResult.isErr()) {
    return err(projectResult.error);
  }

  const project = projectResult.value;
  if (project && project.status === 'archived') {
    return err(createError('CONFLICT', 'Cannot reopen tasks in archived project', false));
  }

  const updatedTask: Task = {
    ...task,
    status: 'ready',
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveTask(updatedTask);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task: updatedTask });
}
