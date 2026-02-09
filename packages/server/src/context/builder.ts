import type { FastifyRequest } from 'fastify';
import type { ExecutionContext } from '@oct/core';

/**
 * Build ExecutionContext from request headers
 * - X-Actor-Id → ctx.actorId
 * - X-Permissions → ctx.permissions (comma-separated)
 * - X-Workspace-Id → ctx.workspaceId (default: 'default')
 */
export function buildExecutionContextFromRequest(request: FastifyRequest): ExecutionContext {
  const actorId = request.headers['x-actor-id'] as string | undefined;
  const workspaceId = request.headers['x-workspace-id'] as string | undefined;
  const permissionsHeader = request.headers['x-permissions'] as string | undefined;

  return {
    actorId: actorId ?? null,
    workspaceId: workspaceId ?? 'default',
    permissions: permissionsHeader?.split(',').map(p => p.trim()).filter(Boolean) ?? [],
    environment: 'server',
    traceId: request.id as string,
    metadata: {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
  };
}
