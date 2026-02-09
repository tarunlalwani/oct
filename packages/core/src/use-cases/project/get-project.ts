import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const getProjectInputSchema = z.object({
  projectId: z.string(),
});

export type GetProjectInput = z.infer<typeof getProjectInputSchema>;

export interface GetProjectOutput {
  project: Project;
}

export async function getProjectUseCase(
  ctx: ExecutionContext,
  input: GetProjectInput,
  adapter: StorageAdapter
): Promise<Result<GetProjectOutput, DomainError>> {
  const result = await adapter.getProject(input.projectId);
  if (result.isErr()) {
    return err(result.error);
  }

  if (!result.value) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  return ok({ project: result.value });
}
