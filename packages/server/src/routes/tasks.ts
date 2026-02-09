import type { FastifyInstance } from 'fastify';
import type { StorageAdapter } from '@oct/core';
import {
  createTaskUseCase,
  listTasksUseCase,
  getTaskUseCase,
  updateTaskUseCase,
  deleteTaskUseCase,
  startTaskUseCase,
  completeTaskUseCase,
  reopenTaskUseCase,
  assignTaskUseCase,
  getReadyTasksUseCase,
  getBlockedTasksUseCase,
  getProjectStatsUseCase,
  getWorkerWorkloadUseCase,
  createTaskInputSchema,
  listTasksFilterSchema,
} from '@oct/core';
import { z } from 'zod';
import { buildExecutionContextFromRequest } from '../context/builder.js';
import { errorToHttpStatus, serializeError, serializeSuccess } from '../serializers/error.js';

// Schema for update task body (without taskId)
const updateTaskBodySchema = z.object({
  title: z.string().min(1).max(256).optional(),
  description: z.string().max(10000).optional(),
  priority: z.number().int().min(1).max(4).optional(),
});

interface TaskRouteParams {
  id: string;
}

interface ProjectRouteParams {
  id: string;
}

interface WorkerRouteParams {
  id: string;
}

export async function taskRoutes(
  fastify: FastifyInstance,
  options: { storageAdapter: StorageAdapter }
): Promise<void> {
  const { storageAdapter } = options;

  // POST /api/v1/tasks - Create task
  fastify.post('/api/v1/tasks', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const parseResult = createTaskInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(serializeError({
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        retryable: false,
      }));
    }
    const result = await createTaskUseCase(ctx, parseResult.data, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.status(201).send(serializeSuccess(result.value));
  });

  // GET /api/v1/tasks - List tasks
  fastify.get('/api/v1/tasks', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const query = request.query as Record<string, string>;
    const parseResult = listTasksFilterSchema.safeParse({
      projectId: query.projectId,
      ownerId: query.ownerId,
      status: query.status,
      priority: query.priority ? parseInt(query.priority, 10) : undefined,
    });
    if (!parseResult.success) {
      return reply.status(400).send(serializeError({
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        retryable: false,
      }));
    }
    const result = await listTasksUseCase(ctx, { filter: parseResult.data }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // GET /api/v1/tasks/ready - Get ready tasks
  fastify.get('/api/v1/tasks/ready', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const query = request.query as Record<string, string>;
    const result = await getReadyTasksUseCase(ctx, { projectId: query.projectId }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // GET /api/v1/tasks/blocked - Get blocked tasks
  fastify.get('/api/v1/tasks/blocked', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const query = request.query as Record<string, string>;
    const result = await getBlockedTasksUseCase(ctx, { projectId: query.projectId }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // GET /api/v1/tasks/:id - Get task
  fastify.get<{ Params: TaskRouteParams }>('/api/v1/tasks/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await getTaskUseCase(ctx, { taskId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // PUT /api/v1/tasks/:id - Update task
  fastify.put<{ Params: TaskRouteParams }>('/api/v1/tasks/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const parseResult = updateTaskBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(serializeError({
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        retryable: false,
      }));
    }
    const input = { ...parseResult.data, taskId: request.params.id };
    const result = await updateTaskUseCase(ctx, input, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // DELETE /api/v1/tasks/:id - Delete task
  fastify.delete<{ Params: TaskRouteParams }>('/api/v1/tasks/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await deleteTaskUseCase(ctx, { taskId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.status(204).send();
  });

  // POST /api/v1/tasks/:id/start - Start task
  fastify.post<{ Params: TaskRouteParams }>('/api/v1/tasks/:id/start', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await startTaskUseCase(ctx, { taskId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // POST /api/v1/tasks/:id/complete - Complete task
  fastify.post<{ Params: TaskRouteParams }>('/api/v1/tasks/:id/complete', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await completeTaskUseCase(ctx, { taskId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // POST /api/v1/tasks/:id/reopen - Reopen task
  fastify.post<{ Params: TaskRouteParams }>('/api/v1/tasks/:id/reopen', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await reopenTaskUseCase(ctx, { taskId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // POST /api/v1/tasks/:id/assign - Assign task
  fastify.post<{ Params: TaskRouteParams }>('/api/v1/tasks/:id/assign', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const body = request.body as { workerId: string };
    const result = await assignTaskUseCase(
      ctx,
      { taskId: request.params.id, workerId: body.workerId },
      storageAdapter
    );

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // GET /api/v1/projects/:id/stats - Get project stats
  fastify.get<{ Params: ProjectRouteParams }>('/api/v1/projects/:id/stats', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await getProjectStatsUseCase(ctx, { projectId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // GET /api/v1/workers/:id/workload - Get worker workload
  fastify.get<{ Params: WorkerRouteParams }>('/api/v1/workers/:id/workload', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await getWorkerWorkloadUseCase(ctx, { workerId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });
}
