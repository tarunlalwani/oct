import type { ExecutionContext } from '@oct/core';

export interface CliContextOptions {
  actorId?: string;
  workspaceId?: string;
  permissions?: string[];
  environment?: 'local' | 'ci' | 'server';
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export function buildExecutionContext(options: CliContextOptions = {}): ExecutionContext {
  return {
    actorId: options.actorId ?? getDefaultActorId(),
    workspaceId: options.workspaceId ?? getDefaultWorkspaceId(),
    permissions: options.permissions ?? getDefaultPermissions(),
    environment: options.environment ?? getDefaultEnvironment(),
    traceId: options.traceId ?? generateTraceId(),
    metadata: options.metadata ?? null,
  };
}

function getDefaultActorId(): string {
  return process.env.OCT_ACTOR_ID ?? 'cli-user';
}

function getDefaultWorkspaceId(): string {
  return process.env.OCT_WORKSPACE_ID ?? 'default';
}

function getDefaultPermissions(): string[] {
  const perms = process.env.OCT_PERMISSIONS;
  if (perms) {
    return perms.split(',').map(p => p.trim());
  }
  // Default full permissions for local CLI usage
  return ['task:create', 'task:read', 'task:run', 'task:update', 'task:delete'];
}

function getDefaultEnvironment(): 'local' | 'ci' | 'server' {
  const env = process.env.OCT_ENVIRONMENT;
  if (env === 'ci' || env === 'server') {
    return env;
  }
  return 'local';
}

function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
