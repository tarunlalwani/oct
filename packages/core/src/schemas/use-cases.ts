import { z } from 'zod';
import { taskSchema } from './task.js';

export const createTaskInputSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const createTaskOutputSchema = z.object({
  task: taskSchema,
});

export type CreateTaskOutput = z.infer<typeof createTaskOutputSchema>;

export const getTaskInputSchema = z.object({
  taskId: z.string(),
});

export type GetTaskInput = z.infer<typeof getTaskInputSchema>;

export const getTaskOutputSchema = z.object({
  task: taskSchema,
});

export type GetTaskOutput = z.infer<typeof getTaskOutputSchema>;

export const runTaskInputSchema = z.object({
  taskId: z.string(),
  options: z.record(z.any()).nullable().optional(),
});

export type RunTaskInput = z.infer<typeof runTaskInputSchema>;

export const runTaskOutputSchema = z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable().optional(),
});

export type RunTaskOutput = z.infer<typeof runTaskOutputSchema>;

export const listTasksInputSchema = z.object({
  limit: z.number().int().positive().optional(),
  cursor: z.string().optional(),
});

export type ListTasksInput = z.infer<typeof listTasksInputSchema>;

export const listTasksOutputSchema = z.object({
  items: z.array(taskSchema),
  nextCursor: z.string().optional(),
});

export type ListTasksOutput = z.infer<typeof listTasksOutputSchema>;
