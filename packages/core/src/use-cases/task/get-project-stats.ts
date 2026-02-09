import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  TaskStatus,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface ProjectStats {
  projectId: string;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<number, number>;
  completionPercentage: number;
  blockedTasks: number;
}

export interface GetProjectStatsInput {
  projectId: string;
}

export interface GetProjectStatsOutput {
  stats: ProjectStats;
}

/**
 * Get project stats use case
 * Returns task counts by status and priority
 * Requires: project:read permission
 */
export async function getProjectStatsUseCase(
  ctx: ExecutionContext,
  input: GetProjectStatsInput,
  adapter: StorageAdapter
): Promise<Result<GetProjectStatsOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.PROJECT_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.PROJECT_READ}`, false));
  }

  // Verify project exists
  const projectResult = await adapter.getProject(input.projectId);
  if (projectResult.isErr()) {
    return err(projectResult.error);
  }
  if (!projectResult.value) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  const tasksResult = await adapter.getTasksByProject(input.projectId);
  if (tasksResult.isErr()) {
    return err(tasksResult.error);
  }

  const tasks = tasksResult.value;

  // Count by status
  const tasksByStatus: Record<TaskStatus, number> = {
    backlog: 0,
    ready: 0,
    active: 0,
    blocked: 0,
    review: 0,
    done: 0,
  };

  for (const task of tasks) {
    tasksByStatus[task.status]++;
  }

  // Count by priority
  const tasksByPriority: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };

  for (const task of tasks) {
    tasksByPriority[task.priority]++;
  }

  const totalTasks = tasks.length;
  const doneTasks = tasksByStatus.done;
  const completionPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const stats: ProjectStats = {
    projectId: input.projectId,
    totalTasks,
    tasksByStatus,
    tasksByPriority,
    completionPercentage,
    blockedTasks: tasksByStatus.blocked,
  };

  return ok({ stats });
}
