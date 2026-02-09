import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import { employeeTemplateSchema, type EmployeeTemplate, capabilitiesSchema } from '../../schemas/template.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const createTemplateInputSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  kind: z.enum(['human', 'ai']),
  defaultCapabilities: capabilitiesSchema,
  skills: z.array(z.string()).default([]),
});

export type CreateTemplateInput = z.infer<typeof createTemplateInputSchema>;

export interface CreateTemplateOutput {
  template: EmployeeTemplate;
}

export async function createTemplateUseCase(
  ctx: ExecutionContext,
  input: CreateTemplateInput,
  adapter: StorageAdapter
): Promise<Result<CreateTemplateOutput, DomainError>> {
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  if (!ctx.permissions.includes('template:create')) {
    return err(createError('FORBIDDEN', 'Missing permission: template:create', false));
  }

  const parseResult = createTemplateInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err(createError('INVALID_INPUT', parseResult.error.errors[0]?.message || 'Invalid input', false));
  }

  const now = new Date().toISOString();
  const templateId = generateId('tmpl');

  const template: EmployeeTemplate = {
    templateId,
    name: input.name.trim(),
    description: input.description ?? null,
    kind: input.kind,
    defaultCapabilities: input.defaultCapabilities,
    skills: input.skills,
    metadata: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const saveResult = await adapter.saveTemplate(template);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ template });
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}${random}`;
}
