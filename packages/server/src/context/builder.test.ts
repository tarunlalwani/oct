import { describe, it, expect } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { buildExecutionContextFromRequest } from './builder.js';

describe('Server Context Builder', () => {
  const createMockRequest = (overrides: Partial<FastifyRequest> = {}): FastifyRequest => {
    return {
      id: 'req-123',
      ip: '127.0.0.1',
      headers: {},
      ...overrides,
    } as FastifyRequest;
  };

  describe('default values', () => {
    it('should set environment to "server"', () => {
      const request = createMockRequest();
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.environment).toBe('server');
    });

    it('should use request id as traceId', () => {
      const request = createMockRequest({ id: 'req-abc' });
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.traceId).toBe('req-abc');
    });

    it('should use "anonymous" as default actorId', () => {
      const request = createMockRequest();
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.actorId).toBe('anonymous');
    });

    it('should use "default" as default workspaceId', () => {
      const request = createMockRequest();
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.workspaceId).toBe('default');
    });

    it('should include default permissions', () => {
      const request = createMockRequest();
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.permissions).toContain('task:create');
      expect(ctx.permissions).toContain('task:read');
      expect(ctx.permissions).toContain('task:run');
      expect(ctx.permissions).toContain('task:update');
      expect(ctx.permissions).toContain('task:delete');
    });

    it('should include request metadata', () => {
      const request = createMockRequest({
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-agent' },
      });
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.metadata).toEqual({
        ip: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });
  });

  describe('header extraction', () => {
    it('should extract actorId from x-actor-id header', () => {
      const request = createMockRequest({
        headers: { 'x-actor-id': 'user-123' },
      });
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.actorId).toBe('user-123');
    });

    it('should extract workspaceId from x-workspace-id header', () => {
      const request = createMockRequest({
        headers: { 'x-workspace-id': 'ws-456' },
      });
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.workspaceId).toBe('ws-456');
    });

    it('should extract permissions from x-permissions header', () => {
      const request = createMockRequest({
        headers: { 'x-permissions': 'task:read,task:delete' },
      });
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.permissions).toEqual(['task:read', 'task:delete']);
    });

    it('should trim whitespace from permissions', () => {
      const request = createMockRequest({
        headers: { 'x-permissions': 'task:read , task:delete' },
      });
      const ctx = buildExecutionContextFromRequest(request);

      expect(ctx.permissions).toEqual(['task:read', 'task:delete']);
    });
  });
});
