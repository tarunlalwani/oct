import type { StorageAdapter, DomainError, Task } from '@oct/core';
import {
  createTaskUseCase,
  listTasksUseCase,
  getTaskUseCase,
  updateTaskUseCase,
  assignTaskUseCase,
  startTaskUseCase,
  completeTaskUseCase,
  createError,
} from '@oct/core';
import { buildMcpContext, formatSuccess, formatError } from '../utils.js';

/**
 * MCP Tool: oct_task_create
 * Create a new task with dependencies
 */
export async function handleTaskCreate(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  if (!args.projectId || typeof args.projectId !== 'string') {
    return formatError(createError('INVALID_INPUT', 'projectId is required'));
  }
  if (!args.title || typeof args.title !== 'string') {
    return formatError(createError('INVALID_INPUT', 'title is required'));
  }
  if (!args.ownerId || typeof args.ownerId !== 'string') {
    return formatError(createError('INVALID_INPUT', 'ownerId is required'));
  }

  const priority = typeof args.priority === 'number' ? args.priority : 2;
  if (priority < 1 || priority > 4) {
    return formatError(createError('INVALID_INPUT', 'priority must be between 1 and 4'));
  }

  const result = await createTaskUseCase(
    ctx,
    {
      projectId: args.projectId,
      title: args.title,
      description: typeof args.description === 'string' ? args.description : '',
      ownerId: args.ownerId,
      priority,
      dependencies: Array.isArray(args.dependencies) ? args.dependencies.map(String) : [],
    },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  const { task } = result.value;
  return formatSuccess({
    taskId: task.taskId,
    projectId: task.projectId,
    title: task.title,
    status: task.status,
    priority: task.priority,
    ownerId: task.ownerId,
    dependencies: task.dependencies,
    createdAt: task.createdAt,
  });
}

/**
 * MCP Tool: oct_task_list
 * List tasks with filters
 */
export async function handleTaskList(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  const result = await listTasksUseCase(
    ctx,
    {
      filter: {
        projectId: typeof args.projectId === 'string' ? args.projectId : undefined,
        ownerId: typeof args.ownerId === 'string' ? args.ownerId : undefined,
        status: args.status === 'backlog' || args.status === 'ready' || args.status === 'active' ||
                args.status === 'blocked' || args.status === 'review' || args.status === 'done'
          ? args.status
          : undefined,
        priority: typeof args.priority === 'number' ? args.priority : undefined,
      },
    },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  return formatSuccess({
    tasks: result.value.tasks.map((t: Task) => ({
      taskId: t.taskId,
      projectId: t.projectId,
      title: t.title,
      status: t.status,
      priority: t.priority,
      ownerId: t.ownerId,
      dependencies: t.dependencies,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  });
}

/**
 * MCP Tool: oct_task_get
 * Get task by ID
 */
export async function handleTaskGet(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  if (!args.taskId || typeof args.taskId !== 'string') {
    return formatError(createError('INVALID_INPUT', 'taskId is required'));
  }

  const result = await getTaskUseCase(
    ctx,
    { taskId: args.taskId },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  const { task } = result.value;
  return formatSuccess({
    taskId: task.taskId,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    ownerId: task.ownerId,
    dependencies: task.dependencies,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });
}

/**
 * MCP Tool: oct_task_update
 * Update task status/assignee/priority
 */
export async function handleTaskUpdate(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  if (!args.taskId || typeof args.taskId !== 'string') {
    return formatError(createError('INVALID_INPUT', 'taskId is required'));
  }

  // Handle status changes through specific use cases
  if (args.status && typeof args.status === 'string') {
    if (args.status === 'active') {
      const startResult = await startTaskUseCase(ctx, { taskId: args.taskId }, adapter);
      if (startResult.isErr()) {
        return formatError(startResult.error);
      }
    } else if (args.status === 'done') {
      const completeResult = await completeTaskUseCase(ctx, { taskId: args.taskId }, adapter);
      if (completeResult.isErr()) {
        return formatError(completeResult.error);
      }
    }
  }

  // Handle assignment change
  if (args.ownerId && typeof args.ownerId === 'string') {
    const assignResult = await assignTaskUseCase(
      ctx,
      { taskId: args.taskId, workerId: args.ownerId },
      adapter
    );
    if (assignResult.isErr()) {
      return formatError(assignResult.error);
    }
  }

  // Handle basic updates (title, description, priority)
  const updateResult = await updateTaskUseCase(
    ctx,
    {
      taskId: args.taskId,
      title: typeof args.title === 'string' ? args.title : undefined,
      description: typeof args.description === 'string' ? args.description : undefined,
      priority: typeof args.priority === 'number' ? args.priority : undefined,
    },
    adapter
  );

  if (updateResult.isErr()) {
    return formatError(updateResult.error);
  }

  const { task } = updateResult.value;
  return formatSuccess({
    taskId: task.taskId,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    ownerId: task.ownerId,
    dependencies: task.dependencies,
    updatedAt: task.updatedAt,
  });
}
