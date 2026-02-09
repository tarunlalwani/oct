import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import { taskSchema, type Task } from '../../schemas/task.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const startTaskInputSchema = z.object({
  taskId: z.string(),
});

export type StartTaskInput = z.infer<typeof startTaskInputSchema>;

export const startTaskOutputSchema = z.object({
  task: taskSchema,
});

export type StartTaskOutput = z.infer<typeof startTaskOutputSchema>;

export async function startTaskUseCase(
  ctx: ExecutionContext,
  input: StartTaskInput,
  adapter: StorageAdapter
): Promise<Result<StartTaskOutput, DomainError>> {
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

  // Check ownership
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

  if (task.status === 'in_progress') {
    return err(createError('CONFLICT', 'Task is already in progress', false));
  }

  const updatedTask: Task = {
    ...task,
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveTask(updatedTask);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task: updatedTask });
}
