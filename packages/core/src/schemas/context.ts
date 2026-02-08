import { z } from 'zod';

export const environmentSchema = z.enum(['local', 'ci', 'server']);

export const executionContextSchema = z.object({
  actorId: z.string().nullable(),
  workspaceId: z.string(),
  permissions: z.array(z.string()),
  environment: environmentSchema,
  traceId: z.string().optional(),
  metadata: z.record(z.any()).nullable().optional(),
}).strict();

export type ExecutionContext = z.infer<typeof executionContextSchema>;
export type Environment = z.infer<typeof environmentSchema>;
