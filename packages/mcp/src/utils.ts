import { randomUUID } from 'crypto';
import type { ExecutionContext } from '@oct/core';
import { PERMISSIONS } from '@oct/core';

/**
 * Build an ExecutionContext for MCP server operations
 * MCP runs as a trusted interface with full permissions
 */
export function buildMcpContext(): ExecutionContext {
  return {
    actorId: 'mcp-server',
    workspaceId: process.env.OCT_WORKSPACE_ID ?? 'default',
    permissions: Object.values(PERMISSIONS),
    environment: 'local',
    traceId: randomUUID(),
  };
}

/**
 * Format a successful result for MCP tool response
 */
export function formatSuccess<T>(data: T): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Format an error result for MCP tool response
 */
export function formatError(error: { code: string; message: string }): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: error.code, message: error.message }, null, 2),
      },
    ],
    isError: true,
  };
}
