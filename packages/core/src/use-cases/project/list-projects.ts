import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';
import type { DomainError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const listProjectsInputSchema = z.object({
  filter: z.object({
    status: z.enum(['active', 'archived', 'paused']).optional(),
    parentId: z.string().optional(),
  }).optional(),
});

export type ListProjectsInput = z.infer<typeof listProjectsInputSchema>;

export interface ListProjectsOutput {
  projects: Project[];
}

export async function listProjectsUseCase(
  ctx: ExecutionContext,
  input: ListProjectsInput,
  adapter: StorageAdapter
): Promise<Result<ListProjectsOutput, DomainError>> {
  // Authentication check (optional - can list projects anonymously)
  // No authorization check needed for listing

  const filter: { status?: string; parentId?: string | null } = {};

  if (input.filter?.status !== undefined) {
    filter.status = input.filter.status;
  }

  if (input.filter?.parentId !== undefined) {
    filter.parentId = input.filter.parentId;
  }

  const result = await adapter.listProjects(filter);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok({ projects: result.value });
}
