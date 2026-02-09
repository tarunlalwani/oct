import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import { taskSchema, type Task } from '../../schemas/task.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const createTaskInputSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(256),
  type: z.string().min(1),
  ownerId: z.string(),
  context: z.string().optional(),
  goal: z.string().optional(),
  deliverable: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  dependencies: z.array(z.string()).default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const createTaskOutputSchema = z.object({
  task: taskSchema,
});

export type CreateTaskOutput = z.infer<typeof createTaskOutputSchema>;

export async function createTaskUseCase(
  ctx: ExecutionContext,
  input: CreateTaskInput,
  adapter: StorageAdapter
): Promise<Result<CreateTaskOutput, DomainError>> {
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  const parseResult = createTaskInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err(createError('INVALID_INPUT', parseResult.error.errors[0]?.message || 'Invalid input', false));
  }

  // Verify project exists
  const projectResult = await adapter.getProject(input.projectId);
  if (projectResult.isErr()) return err(projectResult.error);
  if (!projectResult.value) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  // Verify owner exists
  const employeeResult = await adapter.getEmployee(input.ownerId);
  if (employeeResult.isErr()) return err(employeeResult.error);
  if (!employeeResult.value) {
    return err(createError('NOT_FOUND', `Employee not found: ${input.ownerId}`, false));
  }

  // Check owner is in project
  if (!projectResult.value.employeeIds.includes(input.ownerId)) {
    return err(createError('FORBIDDEN', 'Task owner must be a project member', false));
  }

  // Verify all dependencies exist
  for (const depId of input.dependencies) {
    const depResult = await adapter.getTask(depId);
    if (depResult.isErr()) return err(depResult.error);
    if (!depResult.value) {
      return err(createError('NOT_FOUND', `Dependency task not found: ${depId}`, false));
    }
  }

  // Check for circular dependencies
  const cycleCheck = await wouldCreateCycle('temp-id', input.dependencies, adapter);
  if (cycleCheck) {
    return err(createError('CONFLICT', 'Circular dependency detected', false));
  }

  const now = new Date().toISOString();
  const taskId = generateId('task');

  // Compute initial blockedBy
  const blockedBy: string[] = [];
  for (const depId of input.dependencies) {
    const depResult = await adapter.getTask(depId);
    if (depResult.isOk() && depResult.value && depResult.value.status !== 'done') {
      blockedBy.push(depId);
    }
  }

  const initialStatus = blockedBy.length > 0 ? 'blocked' : 'backlog';

  const task: Task = {
    taskId,
    projectId: input.projectId,
    title: input.title.trim(),
    type: input.type,
    ownerId: input.ownerId,
    context: input.context ?? null,
    goal: input.goal ?? null,
    deliverable: input.deliverable ?? null,
    status: initialStatus,
    priority: input.priority,
    dependencies: input.dependencies,
    blockedBy,
    approval: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  };

  const saveResult = await adapter.saveTask(task);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task });
}

async function wouldCreateCycle(
  taskId: string,
  dependencies: string[],
  adapter: StorageAdapter
): Promise<boolean> {
  const visited = new Set<string>();
  const stack = new Set<string>();

  async function hasCycle(node: string): Promise<boolean> {
    visited.add(node);
    stack.add(node);

    const taskResult = await adapter.getTask(node);
    if (taskResult.isErr() || !taskResult.value) {
      stack.delete(node);
      return false;
    }

    for (const dep of taskResult.value.dependencies) {
      if (!visited.has(dep)) {
        if (await hasCycle(dep)) return true;
      } else if (stack.has(dep)) {
        return true;
      }
    }

    stack.delete(node);
    return false;
  }

  // Build dependency chain starting from new task
  for (const dep of dependencies) {
    if (dep === taskId) return true;
    if (await hasCycle(dep)) return true;
  }

  return false;
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}${random}`;
}
