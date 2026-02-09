import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Employee } from '../../schemas/employee.js';
import type { DomainError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const listEmployeesInputSchema = z.object({
  filter: z.object({
    kind: z.enum(['human', 'ai']).optional(),
    templateId: z.string().optional(),
  }).optional(),
});

export type ListEmployeesInput = z.infer<typeof listEmployeesInputSchema>;

export interface ListEmployeesOutput {
  employees: Employee[];
}

export async function listEmployeesUseCase(
  ctx: ExecutionContext,
  input: ListEmployeesInput,
  adapter: StorageAdapter
): Promise<Result<ListEmployeesOutput, DomainError>> {
  const filter: { kind?: string; templateId?: string } = {};

  if (input.filter?.kind !== undefined) {
    filter.kind = input.filter.kind;
  }

  if (input.filter?.templateId !== undefined) {
    filter.templateId = input.filter.templateId;
  }

  const result = await adapter.listEmployees(filter);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok({ employees: result.value });
}
