import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface BlockedTaskInfo {
  task: Task;
  blockers: Task[];
}

export interface GetBlockedTasksInput {
  projectId?: string;
}

export interface GetBlockedTasksOutput {
  tasks: BlockedTaskInfo[];
}

/**
 * Get blocked tasks use case
 * Returns tasks with incomplete dependencies
 * Requires: task:read permission
 */
export async function getBlockedTasksUseCase(
  ctx: ExecutionContext,
  input: GetBlockedTasksInput,
  adapter: StorageAdapter
): Promise<Result<GetBlockedTasksOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_READ}`, false));
  }

  const filter = input.projectId
    ? { projectId: input.projectId, status: 'blocked' as const }
    : { status: 'blocked' as const };

  const result = await adapter.listTasks(filter);
  if (result.isErr()) {
    return err(result.error);
  }

  const blockedTasks = result.value;

  // Get blocker tasks for each blocked task
  const tasksWithBlockers: BlockedTaskInfo[] = await Promise.all(
    blockedTasks.map(async (task) => {
      const blockerResults = await Promise.all(
        task.dependencies.map(async (depId) => {
          const depResult = await adapter.getTask(depId);
          return depResult.isOk() ? depResult.value : null;
        })
      );

      const blockers = blockerResults.filter(
        (t): t is Task => t !== null && t.status !== 'done'
      );

      return { task, blockers };
    })
  );

  return ok({ tasks: tasksWithBlockers });
}
