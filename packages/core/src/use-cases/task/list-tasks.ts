import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import { taskSchema, type Task } from '../../schemas/task.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const listTasksInputSchema = z.object({
  filter: z.object({
    projectId: z.string().optional(),
    ownerId: z.string().optional(),
    status: z.enum(['backlog', 'todo', 'in_progress', 'blocked', 'in_review', 'done']).optional(),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  }).optional(),
});

export type ListTasksInput = z.infer<typeof listTasksInputSchema>;

export const listTasksOutputSchema = z.object({
  tasks: z.array(taskSchema),
});

export type ListTasksOutput = z.infer<typeof listTasksOutputSchema>;

export async function listTasksUseCase(
  ctx: ExecutionContext,
  input: ListTasksInput,
  adapter: StorageAdapter
): Promise<Result<ListTasksOutput, DomainError>> {
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  const result = await adapter.listTasks(input.filter);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok({ tasks: result.value });
}
