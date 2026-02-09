import type { Task, TaskStatus } from '../schemas/task.js';

export type { Task, TaskStatus };

export function createTask(params: {
  taskId: string;
  title: string;
  createdBy: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  now?: Date;
}): Task {
  const now = params.now ?? new Date();
  return {
    taskId: params.taskId,
    status: 'pending',
    title: params.title,
    description: params.description ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    createdBy: params.createdBy,
    metadata: params.metadata ?? null,
  };
}

export function updateTaskStatus(
  task: Task,
  status: TaskStatus,
  now?: Date
): Task {
  return {
    ...task,
    status,
    updatedAt: (now ?? new Date()).toISOString(),
  };
}
