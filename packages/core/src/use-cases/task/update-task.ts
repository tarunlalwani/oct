import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  UpdateTaskInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface UpdateTaskOutput {
  task: Task;
}

/**
 * Update task use case
 * Requires: task:update permission
 */
export async function updateTaskUseCase(
  ctx: ExecutionContext,
  input: UpdateTaskInput,
  adapter: StorageAdapter
): Promise<Result<UpdateTaskOutput, DomainError>> {
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

  // Get project to check if archived
  const projectResult = await adapter.getProject(task.projectId);
  if (projectResult.isErr()) {
    return err(projectResult.error);
  }

  const project = projectResult.value;
  if (project && project.status === 'archived') {
    return err(createError('CONFLICT', 'Cannot update tasks in archived project', false));
  }

  const updatedTask: Task = {
    ...task,
    title: input.title ?? task.title,
    description: input.description ?? task.description,
    priority: input.priority ?? task.priority,
    updatedAt: new Date().toISOString(),
  };

  const saveResult = await adapter.saveTask(updatedTask);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task: updatedTask });
}
