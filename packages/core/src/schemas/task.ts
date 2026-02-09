import { z } from 'zod';

export const taskStatusSchema = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'blocked',
  'in_review',
  'done',
]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const prioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);

export type Priority = z.infer<typeof prioritySchema>;

export const approvalSchema = z.object({
  state: z.enum(['pending', 'approved', 'rejected', 'auto_approved']),
  approverId: z.string().nullable(),
  approvedAt: z.string().datetime().nullable(),
  policy: z.string(),
}).strict();

export type Approval = z.infer<typeof approvalSchema>;

export const taskSchema = z.object({
  taskId: z.string(),
  projectId: z.string(),
  title: z.string().min(1).max(256),
  type: z.string(),
  ownerId: z.string(),
  context: z.string().max(10000).nullable(),
  goal: z.string().max(10000).nullable(),
  deliverable: z.string().max(10000).nullable(),
  status: taskStatusSchema,
  priority: prioritySchema,
  dependencies: z.array(z.string()),
  blockedBy: z.array(z.string()),
  approval: approvalSchema.nullable(),
  metadata: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type Task = z.infer<typeof taskSchema>;
