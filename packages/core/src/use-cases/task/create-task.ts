import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter } from '../../ports/storage-adapter.js';
import type {
  ExecutionContext,
  Task,
  CreateTaskInput,
  DomainError,
} from '../../schemas/index.js';
import { createError, PERMISSIONS } from '../../schemas/index.js';
import { generateUUID } from '../../utils/uuid.js';

export interface CreateTaskOutput {
  task: Task;
}

/**
 * Create task use case
 * Requires: task:create permission
 * Validates project exists, worker exists and is project member
 * Validates dependencies exist and don't create cycles
 */
export async function createTaskUseCase(
  ctx: ExecutionContext,
  input: CreateTaskInput,
  adapter: StorageAdapter
): Promise<Result<CreateTaskOutput, DomainError>> {
  // Check authentication
  if (!ctx.actorId) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Check authorization
  if (!ctx.permissions.includes(PERMISSIONS.TASK_CREATE)) {
    return err(createError('FORBIDDEN', `Missing permission: ${PERMISSIONS.TASK_CREATE}`, false));
  }

  // Verify project exists
  const projectResult = await adapter.getProject(input.projectId);
  if (projectResult.isErr()) {
    return err(projectResult.error);
  }
  if (!projectResult.value) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  const project = projectResult.value;

  // Cannot add tasks to archived projects
  if (project.status === 'archived') {
    return err(createError('CONFLICT', 'Cannot create tasks in archived project', false));
  }

  // Verify owner exists
  const workerResult = await adapter.getWorker(input.ownerId);
  if (workerResult.isErr()) {
    return err(workerResult.error);
  }
  if (!workerResult.value) {
    return err(createError('NOT_FOUND', `Worker not found: ${input.ownerId}`, false));
  }

  // Check owner is project member
  if (!project.memberIds.includes(input.ownerId)) {
    return err(createError('FORBIDDEN', 'Task owner must be a project member', false));
  }

  // Verify all dependencies exist
  for (const depId of input.dependencies) {
    const depResult = await adapter.getTask(depId);
    if (depResult.isErr()) {
      return err(depResult.error);
    }
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

  // Determine initial status based on dependencies
  const depsDone = await Promise.all(
    input.dependencies.map(async (depId) => {
      const depResult = await adapter.getTask(depId);
      return depResult.isOk() && depResult.value?.status === 'done';
    })
  );

  const allDepsDone = depsDone.every(done => done);
  const initialStatus = input.dependencies.length > 0
    ? (allDepsDone ? 'ready' : 'blocked')
    : 'backlog';

  const task: Task = {
    taskId: generateUUID(),
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    ownerId: input.ownerId,
    status: initialStatus,
    priority: input.priority,
    dependencies: input.dependencies,
    createdAt: now,
    updatedAt: now,
  };

  const saveResult = await adapter.saveTask(task);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ task });
}

/**
 * Check if adding dependencies would create a cycle
 */
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

  for (const dep of dependencies) {
    if (dep === taskId) return true;
    if (await hasCycle(dep)) return true;
  }

  return false;
}
