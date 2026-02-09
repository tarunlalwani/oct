import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Employee } from '../../schemas/employee.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const getEmployeeInputSchema = z.object({
  employeeId: z.string(),
});

export type GetEmployeeInput = z.infer<typeof getEmployeeInputSchema>;

export interface GetEmployeeOutput {
  employee: Employee;
}

export async function getEmployeeUseCase(
  ctx: ExecutionContext,
  input: GetEmployeeInput,
  adapter: StorageAdapter
): Promise<Result<GetEmployeeOutput, DomainError>> {
  const result = await adapter.getEmployee(input.employeeId);
  if (result.isErr()) {
    return err(result.error);
  }

  if (!result.value) {
    return err(createError('NOT_FOUND', `Employee not found: ${input.employeeId}`, false));
  }

  return ok({ employee: result.value });
}
