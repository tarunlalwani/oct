import { describe, it, expect } from 'vitest';
import { buildMcpContext, formatSuccess, formatError } from '../src/utils.js';
import { PERMISSIONS } from '@oct/core';

describe('buildMcpContext', () => {
  it('should create context with mcp-server actorId', () => {
    const ctx = buildMcpContext();
    expect(ctx.actorId).toBe('mcp-server');
  });

  it('should include all permissions', () => {
    const ctx = buildMcpContext();
    expect(ctx.permissions).toEqual(Object.values(PERMISSIONS));
  });

  it('should use default workspaceId when env not set', () => {
    delete process.env.OCT_WORKSPACE_ID;
    const ctx = buildMcpContext();
    expect(ctx.workspaceId).toBe('default');
  });

  it('should use OCT_WORKSPACE_ID from environment', () => {
    process.env.OCT_WORKSPACE_ID = 'test-workspace';
    const ctx = buildMcpContext();
    expect(ctx.workspaceId).toBe('test-workspace');
    delete process.env.OCT_WORKSPACE_ID;
  });

  it('should generate a traceId', () => {
    const ctx = buildMcpContext();
    expect(ctx.traceId).toBeDefined();
    expect(typeof ctx.traceId).toBe('string');
    expect(ctx.traceId?.length).toBeGreaterThan(0);
  });

  it('should set environment to local', () => {
    const ctx = buildMcpContext();
    expect(ctx.environment).toBe('local');
  });
});

describe('formatSuccess', () => {
  it('should format data as JSON text content', () => {
    const data = { test: 'value', number: 123 };
    const result = formatSuccess(data);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('should handle nested objects', () => {
    const data = { nested: { deep: { value: true } } };
    const result = formatSuccess(data);

    expect(JSON.parse(result.content[0].text)).toEqual(data);
  });
});

describe('formatError', () => {
  it('should format error with code and message', () => {
    const error = { code: 'NOT_FOUND', message: 'Resource not found' };
    const result = formatError(error);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('NOT_FOUND');
    expect(parsed.message).toBe('Resource not found');
  });
});
