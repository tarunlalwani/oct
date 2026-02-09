import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import { taskSchema, type Task } from '../../schemas/task.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const completeTaskInputSchema = z.object({
  taskId: z.string(),
});

export type CompleteTaskInput = z.infer<typeof completeTaskInputSchema>;

export const completeTaskOutputSchema = z.object({
  task: taskSchema,
});

export type CompleteTaskOutput = z.infer<typeof completeTaskOutputSchema>;

export async function completeTaskUseCase(
  ctx: ExecutionContext,
  input: CompleteTaskInput,
  adapter: StorageAdapter
): Promise<Result<CompleteTaskOutput, DomainError>> {
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  const taskResult = await adapter.getTask(input.taskId);
  if (taskResult.isErr()) {
    return err(taskResult.error);
  }

  if (!taskResult.value) {
    return err(createError('NOT_FOUND', `Task not found: ${input.taskId}`, false));
  }

  const task = taskResult.value;

  if (task.status !== 'in_progress' && task.status !== 'todo') {
    return err(createError('CONFLICT', `Cannot complete task with status: ${task.status}`, false));
  }

  const ownerResult = await adapter.getEmployee(task.ownerId);
  const canAutoApprove = ownerResult.isOk() && ownerResult.value?.capabilities.canAutoApprove;

  const updatedTask: Task = {
    ...task,
    status: canAutoApprove ? 'done' : 'in_review',
    approval: canAutoApprove ? {
      state: 'auto_approved',
      approverId: task.ownerId,
      approvedAt: new Date().toISOString(),
      policy: 'auto-approve',
    } : null,
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

async function unblockDependentTasks(completedTaskId: string, adapter: StorageAdapter): Promise<void> {
  const dependentsResult = await adapter.getTasksByDependency(completedTaskId);
  if (dependentsResult.isErr()) return;

  for (const dependent of dependentsResult.value) {
    if (dependent.status === 'blocked') {
      const remainingBlockers = dependent.dependencies.filter(async (depId) => {
        const depResult = await adapter.getTask(depId);
        return depResult.isOk() && depResult.value && depResult.value.status !== 'done';
      });

      const blockers = await Promise.all(remainingBlockers);
      if (blockers.length === 0) {
        const updatedDependent: Task = {
          ...dependent,
          status: 'todo',
          blockedBy: [],
          updatedAt: new Date().toISOString(),
        };
        await adapter.saveTask(updatedDependent);
      }
    }
  }
}
