import type { FastifyInstance } from 'fastify';
import {
  createTaskUseCase,
  getTaskUseCase,
  runTaskUseCase,
  listTasksUseCase,
  createTaskInputSchema,
  getTaskInputSchema,
  runTaskInputSchema,
  listTasksInputSchema,
} from '@oct/core';
import type { InMemoryTaskRepositoryFactory } from '@oct/infra';
import { buildExecutionContextFromRequest } from '../context/builder.js';
import { errorToHttpStatus, serializeError, serializeSuccess } from '../serializers/error.js';

export async function taskRoutes(fastify: FastifyInstance, options: { repoFactory: InMemoryTaskRepositoryFactory }): Promise<void> {
  const { repoFactory } = options;

  // POST /v1/tasks - Create task
  fastify.post('/v1/tasks', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const repository = repoFactory.createRepository(ctx.workspaceId);
    const input = createTaskInputSchema.parse(request.body);
    const result = await createTaskUseCase(ctx, input, repository);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.status(201).send(serializeSuccess(result.value));
  });

  // GET /v1/tasks - List tasks
  fastify.get('/v1/tasks', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const repository = repoFactory.createRepository(ctx.workspaceId);
    const query = request.query as Record<string, string>;
    const input = listTasksInputSchema.parse({
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      cursor: query.cursor,
    });
    const result = await listTasksUseCase(ctx, input, repository);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // GET /v1/tasks/:taskId - Get task
  fastify.get('/v1/tasks/:taskId', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const repository = repoFactory.createRepository(ctx.workspaceId);
    const params = request.params as { taskId: string };
    const input = getTaskInputSchema.parse({ taskId: params.taskId });
    const result = await getTaskUseCase(ctx, input, repository);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // POST /v1/tasks/:taskId/run - Run task
  fastify.post('/v1/tasks/:taskId/run', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const repository = repoFactory.createRepository(ctx.workspaceId);
    const params = request.params as { taskId: string };
    const input = runTaskInputSchema.parse({ taskId: params.taskId });
    const result = await runTaskUseCase(ctx, input, repository);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });
}
