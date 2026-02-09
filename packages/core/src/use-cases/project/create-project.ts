import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import { projectSchema, type Project } from '../../schemas/project.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const createProjectInputSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  parentId: z.string().optional(),
  employeeIds: z.array(z.string()).default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const createProjectOutputSchema = z.object({
  project: projectSchema,
});

export type CreateProjectOutput = z.infer<typeof createProjectOutputSchema>;

export async function createProjectUseCase(
  ctx: ExecutionContext,
  input: CreateProjectInput,
  adapter: StorageAdapter
): Promise<Result<CreateProjectOutput, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('project:create')) {
    return err(createError('FORBIDDEN', 'Missing permission: project:create', false));
  }

  // Validate input
  const parseResult = createProjectInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err(createError('INVALID_INPUT', parseResult.error.errors[0]?.message || 'Invalid input', false));
  }

  // Check for circular parent reference
  if (input.parentId) {
    const parentResult = await adapter.getProject(input.parentId);
    if (parentResult.isErr()) return err(parentResult.error);
    if (!parentResult.value) {
      return err(createError('NOT_FOUND', `Parent project not found: ${input.parentId}`, false));
    }

    // Check if parent is archived
    if (parentResult.value.status === 'archived') {
      return err(createError('CONFLICT', 'Cannot create sub-project under archived project', false));
    }
  }

  const now = new Date().toISOString();
  const projectId = generateId('proj');

  const project: Project = {
    projectId,
    name: input.name.trim(),
    description: input.description ?? null,
    parentId: input.parentId ?? null,
    employeeIds: input.employeeIds,
    status: 'active',
    metadata: null,
    createdAt: now,
    updatedAt: now,
  };

  const saveResult = await adapter.saveProject(project);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ project });
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}${random}`;
}
