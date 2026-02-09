import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  TaskStatus,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';

export interface WorkerWorkload {
  workerId: string;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  highPriorityTasks: number; // Priority 1 or 2
}

export interface GetWorkerWorkloadInput {
  workerId: string;
}

export interface GetWorkerWorkloadOutput {
  workload: WorkerWorkload;
}

/**
 * Get worker workload use case
 * Returns task counts by status for a worker
 * Requires: worker:read permission
 */
export async function getWorkerWorkloadUseCase(
  ctx: ExecutionContext,
  input: GetWorkerWorkloadInput,
  adapter: StorageAdapter
): Promise<Result<GetWorkerWorkloadOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.WORKER_READ)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.WORKER_READ}`, false));
  }

  // Verify worker exists
  const workerResult = await adapter.getWorker(input.workerId);
  if (workerResult.isErr()) {
    return err(workerResult.error);
  }
  if (!workerResult.value) {
    return err(createError('NOT_FOUND', `Worker not found: ${input.workerId}`, false));
  }

  const tasksResult = await adapter.getTasksByOwner(input.workerId);
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

  // Count high priority tasks (P1 or P2)
  const highPriorityTasks = tasks.filter((t) => t.priority <= 2 && t.status !== 'done').length;

  const workload: WorkerWorkload = {
    workerId: input.workerId,
    totalTasks: tasks.length,
    tasksByStatus,
    highPriorityTasks,
  };

  return ok({ workload });
}
