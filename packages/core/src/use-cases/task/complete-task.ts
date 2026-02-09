import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  CompleteTaskInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface CompleteTaskOutput {
  task: Task;
}

/**
 * Complete task use case
 * Requires: task:complete permission
 * Transitions task to 'review' status
 * Unblocks dependent tasks
 */
export async function completeTaskUseCase(
  ctx: ExecutionContext,
  input: CompleteTaskInput,
  adapter: StorageAdapter
): Promise<Result<CompleteTaskOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_COMPLETE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_COMPLETE}`, false));
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
    return err(createError('FORBIDDEN', 'Only task owner can complete the task', false));
  }

  // Can only complete from 'active' status
  if (task.status !== 'active') {
    return err(createError('CONFLICT', `Cannot complete task with status: ${task.status}`, false));
  }

  const updatedTask: Task = {
    ...task,
    status: 'review',
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveTask(updatedTask);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  // Unblock dependent tasks
  await unblockDependentTasks(input.taskId, adapter);

  return ok({ task: updatedTask });
}

/**
 * Unblock tasks that depend on the completed task
 */
async function unblockDependentTasks(completedTaskId: string, adapter: StorageAdapter): Promise<void> {
  const allTasksResult = await adapter.listTasks();
  if (allTasksResult.isErr()) return;

  const dependents = allTasksResult.value.filter(
    (t) => t.dependencies.includes(completedTaskId) && t.status === 'blocked'
  );

  for (const dependent of dependents) {
    // Check ALL dependencies are done
    const depStatuses = await Promise.all(
      dependent.dependencies.map(async (depId) => {
        const depResult = await adapter.getTask(depId);
        return depResult.isOk() && depResult.value?.status === 'done';
      })
    );

    const allDone = depStatuses.every((status) => status);
    if (allDone) {
      const updatedDependent: Task = {
        ...dependent,
        status: 'ready',
        updatedAt: new Date().toISOString(),
      };
      await adapter.saveTask(updatedDependent);
    }
  }
}
