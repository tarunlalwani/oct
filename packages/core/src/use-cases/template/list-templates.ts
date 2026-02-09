import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import type { EmployeeTemplate } from '../../schemas/template.js';
import type { DomainError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export interface ListTemplatesOutput {
  templates: EmployeeTemplate[];
}

export async function listTemplatesUseCase(
  ctx: ExecutionContext,
  input: {},
  adapter: StorageAdapter
): Promise<Result<ListTemplatesOutput, DomainError>> {
  const result = await adapter.listTemplates();
  if (result.isErr()) {
    return err(result.error);
  }

  return ok({ templates: result.value });
}
