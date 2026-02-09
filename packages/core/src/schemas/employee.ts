import { z } from 'zod';

export const employeeKindSchema = z.enum(['human', 'ai']);

export type EmployeeKind = z.infer<typeof employeeKindSchema>;

export const capabilitiesSchema = z.object({
  canExecuteTasks: z.boolean(),
  canCreateTasks: z.boolean(),
  canAutoApprove: z.boolean(),
}).strict();

export type Capabilities = z.infer<typeof capabilitiesSchema>;

export const employeeSchema = z.object({
  employeeId: z.string(),
  name: z.string().min(1).max(256),
  kind: employeeKindSchema,
  templateId: z.string().nullable(),
  capabilities: capabilitiesSchema,
  metadata: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type Employee = z.infer<typeof employeeSchema>;
