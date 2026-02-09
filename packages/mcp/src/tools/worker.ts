import type { StorageAdapter, DomainError, Worker } from '@oct/core';
import {
  createWorkerUseCase,
  listWorkersUseCase,
  getWorkerUseCase,
  deleteWorkerUseCase,
  createError,
} from '@oct/core';
import { buildMcpContext, formatSuccess, formatError } from '../utils.js';

/**
 * MCP Tool: oct_worker_create
 * Create a new worker (human or agent)
 */
export async function handleWorkerCreate(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  const result = await createWorkerUseCase(
    ctx,
    {
      name: String(args.name),
      type: args.type === 'agent' ? 'agent' : 'human',
      roles: Array.isArray(args.roles) ? args.roles.map(String) : [],
      permissions: [],
    },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  const { worker } = result.value;
  return formatSuccess({
    workerId: worker.workerId,
    name: worker.name,
    type: worker.type,
    roles: worker.roles,
    createdAt: worker.createdAt,
  });
}

/**
 * MCP Tool: oct_worker_list
 * List all workers with optional type filter
 */
export async function handleWorkerList(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  const result = await listWorkersUseCase(ctx, {}, adapter);

  if (result.isErr()) {
    return formatError(result.error);
  }

  let workers = result.value.workers;

  // Apply type filter if provided
  if (args.type === 'human' || args.type === 'agent') {
    workers = workers.filter((w: Worker) => w.type === args.type);
  }

  return formatSuccess({
    workers: workers.map((w: Worker) => ({
      workerId: w.workerId,
      name: w.name,
      type: w.type,
      roles: w.roles,
      createdAt: w.createdAt,
    })),
  });
}

/**
 * MCP Tool: oct_worker_get
 * Get worker by ID
 */
export async function handleWorkerGet(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  if (!args.workerId || typeof args.workerId !== 'string') {
    return formatError(createError('INVALID_INPUT', 'workerId is required'));
  }

  const result = await getWorkerUseCase(
    ctx,
    { workerId: args.workerId },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  const { worker } = result.value;
  return formatSuccess({
    workerId: worker.workerId,
    name: worker.name,
    type: worker.type,
    roles: worker.roles,
    permissions: worker.permissions,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  });
}

/**
 * MCP Tool: oct_worker_delete
 * Delete worker by ID
 */
export async function handleWorkerDelete(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  if (!args.workerId || typeof args.workerId !== 'string') {
    return formatError(createError('INVALID_INPUT', 'workerId is required'));
  }

  const result = await deleteWorkerUseCase(
    ctx,
    { workerId: args.workerId },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  return formatSuccess({
    success: true,
    message: `Worker ${args.workerId} deleted successfully`,
  });
}
