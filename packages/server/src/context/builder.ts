import type { FastifyRequest } from 'fastify';
import type { ExecutionContext } from '@oct/core';

export function buildExecutionContextFromRequest(request: FastifyRequest): ExecutionContext {
  // In a real implementation, this would extract auth info from headers
  // and validate tokens. For now, we use sensible defaults or headers.

  const actorId = request.headers['x-actor-id'] as string | undefined;
  const workspaceId = request.headers['x-workspace-id'] as string | undefined;
  const permissionsHeader = request.headers['x-permissions'] as string | undefined;

  return {
    actorId: actorId ?? 'anonymous',
    workspaceId: workspaceId ?? 'default',
    permissions: permissionsHeader?.split(',').map(p => p.trim()) ?? [
      'task:create',
      'task:read',
      'task:run',
      'task:update',
      'task:delete',
    ],
    environment: 'server',
    traceId: request.id as string,
    metadata: {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
  };
}
