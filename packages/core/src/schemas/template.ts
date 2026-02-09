import { z } from 'zod';
import { employeeKindSchema, capabilitiesSchema } from './employee.js';

export const employeeTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().max(10000).nullable(),
  kind: employeeKindSchema,
  defaultCapabilities: capabilitiesSchema,
  skills: z.array(z.string()),
  metadata: z.record(z.any()).nullable(),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type EmployeeTemplate = z.infer<typeof employeeTemplateSchema>;
