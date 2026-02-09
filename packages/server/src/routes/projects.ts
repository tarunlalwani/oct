import type { FastifyInstance } from 'fastify';
import type { StorageAdapter } from '@oct/core';
import {
  createProjectUseCase,
  listProjectsUseCase,
  getProjectUseCase,
  updateProjectUseCase,
  archiveProjectUseCase,
  deleteProjectUseCase,
  addProjectMemberUseCase,
  removeProjectMemberUseCase,
  createProjectInputSchema,
  listProjectsFilterSchema,
} from '@oct/core';
import { z } from 'zod';
import { buildExecutionContextFromRequest } from '../context/builder.js';
import { errorToHttpStatus, serializeError, serializeSuccess } from '../serializers/error.js';

// Schema for update project body (without projectId)
const updateProjectBodySchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(10000).optional(),
});

interface ProjectRouteParams {
  id: string;
}

interface ProjectMemberRouteParams {
  id: string;
  workerId: string;
}

export async function projectRoutes(
  fastify: FastifyInstance,
  options: { storageAdapter: StorageAdapter }
): Promise<void> {
  const { storageAdapter } = options;

  // POST /api/v1/projects - Create project
  fastify.post('/api/v1/projects', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const parseResult = createProjectInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(serializeError({
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        retryable: false,
      }));
    }
    const result = await createProjectUseCase(ctx, parseResult.data, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.status(201).send(serializeSuccess(result.value));
  });

  // GET /api/v1/projects - List projects
  fastify.get('/api/v1/projects', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const query = request.query as Record<string, string>;
    const parseResult = listProjectsFilterSchema.safeParse({
      status: query.status,
      parentId: query.parentId,
    });
    if (!parseResult.success) {
      return reply.status(400).send(serializeError({
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        retryable: false,
      }));
    }
    const result = await listProjectsUseCase(ctx, { filter: parseResult.data }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // GET /api/v1/projects/:id - Get project
  fastify.get<{ Params: ProjectRouteParams }>('/api/v1/projects/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await getProjectUseCase(ctx, { projectId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // PUT /api/v1/projects/:id - Update project
  fastify.put<{ Params: ProjectRouteParams }>('/api/v1/projects/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const parseResult = updateProjectBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(serializeError({
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        retryable: false,
      }));
    }
    const input = { ...parseResult.data, projectId: request.params.id };
    const result = await updateProjectUseCase(ctx, input, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // DELETE /api/v1/projects/:id - Delete project
  fastify.delete<{ Params: ProjectRouteParams }>('/api/v1/projects/:id', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await deleteProjectUseCase(ctx, { projectId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.status(204).send();
  });

  // POST /api/v1/projects/:id/archive - Archive project
  fastify.post<{ Params: ProjectRouteParams }>('/api/v1/projects/:id/archive', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const result = await archiveProjectUseCase(ctx, { projectId: request.params.id }, storageAdapter);

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // POST /api/v1/projects/:id/members - Add member
  fastify.post<{ Params: ProjectRouteParams }>('/api/v1/projects/:id/members', async (request, reply) => {
    const ctx = buildExecutionContextFromRequest(request);
    const body = request.body as { workerId: string };
    const result = await addProjectMemberUseCase(
      ctx,
      { projectId: request.params.id, workerId: body.workerId },
      storageAdapter
    );

    if (result.isErr()) {
      return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
    }
    return reply.send(serializeSuccess(result.value));
  });

  // DELETE /api/v1/projects/:id/members/:workerId - Remove member
  fastify.delete<{ Params: ProjectMemberRouteParams }>(
    '/api/v1/projects/:id/members/:workerId',
    async (request, reply) => {
      const ctx = buildExecutionContextFromRequest(request);
      const result = await removeProjectMemberUseCase(
        ctx,
        { projectId: request.params.id, workerId: request.params.workerId },
        storageAdapter
      );

      if (result.isErr()) {
        return reply.status(errorToHttpStatus(result.error)).send(serializeError(result.error));
      }
      return reply.send(serializeSuccess(result.value));
    }
  );
}
