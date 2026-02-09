import { err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  DeleteTaskInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

/**
 * Delete task use case
 * Requires: task:delete permission
 * Task must have no dependent tasks
 */
export async function deleteTaskUseCase(
  ctx: ExecutionContext,
  input: DeleteTaskInput,
  adapter: StorageAdapter
): Promise<Result<void, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_DELETE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_DELETE}`, false));
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
    return err(createError('CONFLICT', 'Cannot delete tasks in archived project', false));
  }

  // Check for dependent tasks
  const allTasksResult = await adapter.listTasks();
  if (allTasksResult.isErr()) {
    return err(allTasksResult.error);
  }

  const dependentTasks = allTasksResult.value.filter(
    (t) => t.dependencies.includes(input.taskId)
  );

  if (dependentTasks.length > 0) {
    return err(
      createError(
        'CONFLICT',
        `Cannot delete task with ${dependentTasks.length} dependent task(s). Remove dependencies first.`,
        false,
        { dependentTaskCount: dependentTasks.length }
      )
    );
  }

  return await adapter.deleteTask(input.taskId);
}
