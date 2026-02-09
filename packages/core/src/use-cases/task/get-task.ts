import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import { taskSchema, type Task } from '../../schemas/task.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const getTaskInputSchema = z.object({
  taskId: z.string(),
});

export type GetTaskInput = z.infer<typeof getTaskInputSchema>;

export const getTaskOutputSchema = z.object({
  task: taskSchema,
});

export type GetTaskOutput = z.infer<typeof getTaskOutputSchema>;

export async function getTaskUseCase(
  ctx: ExecutionContext,
  input: GetTaskInput,
  adapter: StorageAdapter
): Promise<Result<GetTaskOutput, DomainError>> {
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

  return ok({ task: taskResult.value });
}
