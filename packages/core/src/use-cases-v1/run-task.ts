import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../schemas/context.js';
import type { RunTaskInput, RunTaskOutput } from '../schemas/use-cases.js';
import type { DomainError } from '../schemas/error.js';
import { createError } from '../schemas/error.js';
import { updateTaskStatus } from '../domain/task.js';
import type { TaskRepository } from '../ports/task-repository.js';

export async function runTaskUseCase(
  ctx: ExecutionContext,
  input: RunTaskInput,
  repository: TaskRepository
): Promise<Result<RunTaskOutput, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('task:run')) {
    return err(createError('FORBIDDEN', 'Missing permission: task:run', false));
  }

  // Validate input
  if (!input.taskId || input.taskId.trim().length === 0) {
    return err(createError('INVALID_INPUT', 'taskId is required', false));
  }

  // Get the task
  const getResult = await repository.get(input.taskId);
  if (getResult.isErr()) {
    return err(getResult.error);
  }

  const task = getResult.value;
  if (!task) {
    return err(createError('NOT_FOUND', `Task not found: ${input.taskId}`, false));
  }

  // Check if task can be run
  if (task.status === 'running') {
    return err(createError('CONFLICT', 'Task is already running', false));
  }

  if (task.status === 'completed') {
    return err(createError('CONFLICT', 'Task is already completed', false));
  }

  // Update to running
  const now = new Date();
  const runningTask = updateTaskStatus(task, 'running', now);
  const saveResult = await repository.save(runningTask);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  // Return the result (actual execution would be async in a real system)
  return ok({
    taskId: task.taskId,
    status: 'running',
    startedAt: now.toISOString(),
  });
}
