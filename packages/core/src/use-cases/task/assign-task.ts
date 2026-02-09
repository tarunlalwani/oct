import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  AssignTaskInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface AssignTaskOutput {
  task: Task;
}

/**
 * Assign task use case
 * Requires: task:assign permission
 * Changes task owner
 */
export async function assignTaskUseCase(
  ctx: ExecutionContext,
  input: AssignTaskInput,
  adapter: StorageAdapter
): Promise<Result<AssignTaskOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_ASSIGN)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_ASSIGN}`, false));
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

  // Get project to check membership
  const projectResult = await adapter.getProject(task.projectId);
  if (projectResult.isErr()) {
    return err(projectResult.error);
  }

  const project = projectResult.value;
  if (!project) {
    return err(createError('NOT_FOUND', `Project not found: ${task.projectId}`, false));
  }

  // Cannot assign in archived project
  if (project.status === 'archived') {
    return err(createError('CONFLICT', 'Cannot assign tasks in archived project', false));
  }

  // Verify new worker exists
  const workerResult = await adapter.getWorker(input.workerId);
  if (workerResult.isErr()) {
    return err(workerResult.error);
  }
  if (!workerResult.value) {
    return err(createError('NOT_FOUND', `Worker not found: ${input.workerId}`, false));
  }

  // Check new worker is project member
  if (!project.memberIds.includes(input.workerId)) {
    return err(createError('FORBIDDEN', 'New owner must be a project member', false));
  }

  const updatedTask: Task = {
    ...task,
    ownerId: input.workerId,
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveTask(updatedTask);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task: updatedTask });
}
