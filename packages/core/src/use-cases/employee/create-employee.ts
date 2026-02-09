import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import { employeeSchema, type Employee, capabilitiesSchema } from '../../schemas/employee.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const createEmployeeInputSchema = z.object({
  name: z.string().min(1).max(256),
  kind: z.enum(['human', 'ai']),
  templateId: z.string().optional(),
  capabilities: capabilitiesSchema,
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

export interface CreateEmployeeOutput {
  employee: Employee;
}

export async function createEmployeeUseCase(
  ctx: ExecutionContext,
  input: CreateEmployeeInput,
  adapter: StorageAdapter
): Promise<Result<CreateEmployeeOutput, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('employee:create')) {
    return err(createError('FORBIDDEN', 'Missing permission: employee:create', false));
  }

  // Validate input
  const parseResult = createEmployeeInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err(createError('INVALID_INPUT', parseResult.error.errors[0]?.message || 'Invalid input', false));
  }

  let capabilities = input.capabilities;

  // If templateId provided, merge template defaults with provided capabilities
  if (input.templateId) {
    const templateResult = await adapter.getTemplate(input.templateId);
    if (templateResult.isErr()) return err(templateResult.error);
    if (!templateResult.value) {
      return err(createError('NOT_FOUND', `Template not found: ${input.templateId}`, false));
    }

    const template = templateResult.value;
    capabilities = {
      ...template.defaultCapabilities,
      ...input.capabilities,
    };
  }

  const now = new Date().toISOString();
  const employeeId = generateId('emp');

  const employee: Employee = {
    employeeId,
    name: input.name.trim(),
    kind: input.kind,
    templateId: input.templateId ?? null,
    capabilities,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  };

  const saveResult = await adapter.saveEmployee(employee);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ employee });
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}${random}`;
}
