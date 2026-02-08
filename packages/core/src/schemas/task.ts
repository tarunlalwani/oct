import { z } from 'zod';

export const taskStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskSchema = z.object({
  taskId: z.string(),
  status: taskStatusSchema,
  title: z.string().min(1).max(256),
  description: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
});

export type Task = z.infer<typeof taskSchema>;
