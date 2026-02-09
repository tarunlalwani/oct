import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  StartTaskInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface StartTaskOutput {
  task: Task;
}

/**
 * Start task use case
 * Requires: task:start permission
 * Task must be in 'ready' status (dependencies satisfied)
 */
export async function startTaskUseCase(
  ctx: ExecutionContext,
  input: StartTaskInput,
  adapter: StorageAdapter
): Promise<Result<StartTaskOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_START)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_START}`, false));
  }

  const taskResult = await adapter.getTask(input.taskId);
  if (taskResult.isErr()) {
    return err(taskResult.error);
  }

  if (!taskResult.value) {
    return err(createError('NOT_FOUND', `Task not found: ${input.taskId}`, false));
  }

  const task = taskResult.value;

  // Check ownership or task:manage permission
  if (task.ownerId !== ctx.actorId && !ctx.permissions.includes('task:manage')) {
    return err(createError('FORBIDDEN', 'Only task owner can start the task', false));
  }

  // Check dependencies are done
  for (const depId of task.dependencies) {
    const depResult = await adapter.getTask(depId);
    if (depResult.isErr()) continue;
    if (depResult.value && depResult.value.status !== 'done') {
      return err(createError('CONFLICT', `Cannot start task: dependency ${depId} is not completed`, false));
    }
  }

  // Can only start from 'ready' status
  if (task.status !== 'ready') {
    return err(createError('CONFLICT', `Cannot start task with status: ${task.status}`, false));
  }

  const updatedTask: Task = {
    ...task,
    status: 'active',
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveTask(updatedTask);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task: updatedTask });
}
