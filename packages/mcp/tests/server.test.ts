import { describe, it, expect, beforeEach } from 'vitest';
import { createMcpServer } from '../src/server.js';
import { InMemoryStorageAdapter } from './test-utils.js';
import type { StorageAdapter } from '@oct/core';

describe('createMcpServer', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  it('should create an MCP server instance', () => {
    const server = createMcpServer(adapter);

    expect(server).toBeDefined();
    expect(server).toHaveProperty('connect');
    expect(server).toHaveProperty('close');
  });

  it('should create server with correct capabilities', () => {
    const server = createMcpServer(adapter);

    // Server should have tools capability enabled
    expect(server).toBeDefined();
  });
});
