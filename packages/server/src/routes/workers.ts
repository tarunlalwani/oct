import type { FastifyInstance } from 'fastify';
import type { StorageAdapter } from '@oct/core';
import {
  createWorkerUseCase,
  listWorkersUseCase,
  getWorkerUseCase,
  updateWorkerUseCase,
  deleteWorkerUseCase,
  createWorkerInputSchema,
} from '@oct/core';
import { z } from 'zod';
import { buildExecutionContextFromRequest } from '../context/builder.js';
import { errorToHttpStatus, serializeError, serializeSuccess } from '../serializers/error.js';

// Schema for update worker body (without workerId)
const updateWorkerBodySchema = z.object({
  name: z.string().min(1).max(256).optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

interface WorkerRouteParams {
  id: string;
}

export async function workerRoutes(
  fastify: FastifyInstance,
  options: { storageAdapter: StorageAdapter }
): Promise<void> {
  const { storageAdapter } = options;

  // POST /api/v1/workers - Create worker
  fastify.post('/api/v1/workers', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const parseResult = createWorkerInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(serializeError({
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        retryable: false,
      }));
    }
    const result = await createWorkerUseCase(ctx, parseResult.data, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.status(201).send(serializeSuccess(result.value));
  });

  // GET /api/v1/workers - List workers
  fastify.get('/api/v1/workers', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await listWorkersUseCase(ctx, {}, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // GET /api/v1/workers/:id - Get worker
  fastify.get<{ Params: WorkerRouteParams }>('/api/v1/workers/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await getWorkerUseCase(ctx, { workerId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // PUT /api/v1/workers/:id - Update worker
  fastify.put<{ Params: WorkerRouteParams }>('/api/v1/workers/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const parseResult = updateWorkerBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(serializeError({
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        retryable: false,
      }));
    }
    const input = { ...parseResult.data, workerId: request.params.id };
    const result = await updateWorkerUseCase(ctx, input, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // DELETE /api/v1/workers/:id - Delete worker
  fastify.delete<{ Params: WorkerRouteParams }>('/api/v1/workers/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await deleteWorkerUseCase(ctx, { workerId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.status(204).send();
  });
}
