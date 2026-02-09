import { z } from 'zod';

export const projectStatusSchema = z.enum(['active', 'archived', 'paused']);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().max(10000).nullable(),
  parentId: z.string().nullable(),
  employeeIds: z.array(z.string()),
  status: projectStatusSchema,
  metadata: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type Project = z.infer<typeof projectSchema>;
