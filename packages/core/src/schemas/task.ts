import { z } from 'zod';

/**
 * Task schema - v3 simplified
 */

export const taskStatusSchema = z.enum([
  'backlog',
  'ready',      // Can be started (deps satisfied)
  'active',     // In progress
  'blocked',    // Waiting on deps
  'review',     // Pending review
  'done',
]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

/**
 * Priority is numeric: 1 (highest) > 2 > 3 > 4 (lowest)
 */
export const prioritySchema = z.number().int().min(1).max(4);

export type Priority = z.infer<typeof prioritySchema>;

export const taskSchema = z.object({
  taskId: z.string(),
  projectId: z.string(),
  title: z.string().min(1).max(256),
  description: z.string().max(10000),
  ownerId: z.string(),
  status: taskStatusSchema,
  priority: prioritySchema,
  dependencies: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type Task = z.infer<typeof taskSchema>;

/**
 * Create task input schema
 */
export const createTaskInputSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(256),
  description: z.string().max(10000).default(''),
  ownerId: z.string(),
  priority: prioritySchema.default(2),
  dependencies: z.array(z.string()).default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

/**
 * Update task input schema
 */
export const updateTaskInputSchema = z.object({
  taskId: z.string(),
  title: z.string().min(1).max(256).optional(),
  description: z.string().max(10000).optional(),
  priority: prioritySchema.optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

/**
 * Move task input schema
 */
export const moveTaskInputSchema = z.object({
  taskId: z.string(),
  newProjectId: z.string(),
});

export type MoveTaskInput = z.infer<typeof moveTaskInputSchema>;

/**
 * Delete task input schema
 */
export const deleteTaskInputSchema = z.object({
  taskId: z.string(),
});

export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;

/**
 * Start task input schema
 */
export const startTaskInputSchema = z.object({
  taskId: z.string(),
});

export type StartTaskInput = z.infer<typeof startTaskInputSchema>;

/**
 * Complete task input schema
 */
export const completeTaskInputSchema = z.object({
  taskId: z.string(),
});

export type CompleteTaskInput = z.infer<typeof completeTaskInputSchema>;

/**
 * Reopen task input schema
 */
export const reopenTaskInputSchema = z.object({
  taskId: z.string(),
});

export type ReopenTaskInput = z.infer<typeof reopenTaskInputSchema>;

/**
 * Assign task input schema
 */
export const assignTaskInputSchema = z.object({
  taskId: z.string(),
  workerId: z.string(),
});

export type AssignTaskInput = z.infer<typeof assignTaskInputSchema>;

/**
 * List tasks filter schema
 */
export const listTasksFilterSchema = z.object({
  projectId: z.string().optional(),
  ownerId: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
});

export type ListTasksFilter = z.infer<typeof listTasksFilterSchema>;
