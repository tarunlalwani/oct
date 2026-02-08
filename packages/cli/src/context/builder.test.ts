import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildExecutionContext } from './builder.js';

describe('CLI Context Builder', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OCT_ACTOR_ID;
    delete process.env.OCT_WORKSPACE_ID;
    delete process.env.OCT_PERMISSIONS;
    delete process.env.OCT_ENVIRONMENT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('default values', () => {
    it('should use default actorId when env not set', () => {
      const ctx = buildExecutionContext();
      expect(ctx.actorId).toBe('cli-user');
    });

    it('should use default workspaceId when env not set', () => {
      const ctx = buildExecutionContext();
      expect(ctx.workspaceId).toBe('default');
    });

    it('should use default permissions when env not set', () => {
      const ctx = buildExecutionContext();
      expect(ctx.permissions).toContain('task:create');
      expect(ctx.permissions).toContain('task:read');
      expect(ctx.permissions).toContain('task:run');
      expect(ctx.permissions).toContain('task:update');
      expect(ctx.permissions).toContain('task:delete');
    });

    it('should use "local" as default environment', () => {
      const ctx = buildExecutionContext();
      expect(ctx.environment).toBe('local');
    });

    it('should generate a traceId', () => {
      const ctx = buildExecutionContext();
      expect(ctx.traceId).toBeDefined();
      expect(ctx.traceId).toContain('trace-');
    });

    it('should set metadata to null by default', () => {
      const ctx = buildExecutionContext();
      expect(ctx.metadata).toBeNull();
    });
  });

  describe('environment variables', () => {
    it('should use OCT_ACTOR_ID from environment', () => {
      process.env.OCT_ACTOR_ID = 'env-user';
      const ctx = buildExecutionContext();
      expect(ctx.actorId).toBe('env-user');
    });

    it('should use OCT_WORKSPACE_ID from environment', () => {
      process.env.OCT_WORKSPACE_ID = 'env-workspace';
      const ctx = buildExecutionContext();
      expect(ctx.workspaceId).toBe('env-workspace');
    });

    it('should parse OCT_PERMISSIONS from environment', () => {
      process.env.OCT_PERMISSIONS = 'task:read,task:delete';
      const ctx = buildExecutionContext();
      expect(ctx.permissions).toEqual(['task:read', 'task:delete']);
    });

    it('should trim whitespace from permissions', () => {
      process.env.OCT_PERMISSIONS = 'task:read , task:delete';
      const ctx = buildExecutionContext();
      expect(ctx.permissions).toEqual(['task:read', 'task:delete']);
    });

    it('should use "ci" environment when OCT_ENVIRONMENT=ci', () => {
      process.env.OCT_ENVIRONMENT = 'ci';
      const ctx = buildExecutionContext();
      expect(ctx.environment).toBe('ci');
    });

    it('should use "server" environment when OCT_ENVIRONMENT=server', () => {
      process.env.OCT_ENVIRONMENT = 'server';
      const ctx = buildExecutionContext();
      expect(ctx.environment).toBe('server');
    });
  });

  describe('options override', () => {
    it('should use provided actorId', () => {
      const ctx = buildExecutionContext({ actorId: 'opt-user' });
      expect(ctx.actorId).toBe('opt-user');
    });

    it('should use provided workspaceId', () => {
      const ctx = buildExecutionContext({ workspaceId: 'opt-workspace' });
      expect(ctx.workspaceId).toBe('opt-workspace');
    });

    it('should use provided permissions', () => {
      const ctx = buildExecutionContext({ permissions: ['task:read'] });
      expect(ctx.permissions).toEqual(['task:read']);
    });

    it('should use provided environment', () => {
      const ctx = buildExecutionContext({ environment: 'ci' });
      expect(ctx.environment).toBe('ci');
    });

    it('should use provided traceId', () => {
      const ctx = buildExecutionContext({ traceId: 'custom-trace' });
      expect(ctx.traceId).toBe('custom-trace');
    });

    it('should use provided metadata', () => {
      const ctx = buildExecutionContext({ metadata: { key: 'value' } });
      expect(ctx.metadata).toEqual({ key: 'value' });
    });
  });

  describe('precedence', () => {
    it('options should override environment variables', () => {
      process.env.OCT_ACTOR_ID = 'env-user';
      const ctx = buildExecutionContext({ actorId: 'opt-user' });
      expect(ctx.actorId).toBe('opt-user');
    });

    it('environment variables should override defaults', () => {
      process.env.OCT_ACTOR_ID = 'env-user';
      const ctx = buildExecutionContext();
      expect(ctx.actorId).toBe('env-user');
    });
  });
});
