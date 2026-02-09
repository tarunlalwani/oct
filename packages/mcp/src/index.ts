#!/usr/bin/env node

import { FileSystemStorageAdapter } from '@oct/storage-fs';
import { startMcpServer } from './server.js';

/**
 * Get storage path from environment or use default
 */
function getStoragePath(): string {
  if (process.env.OCT_DB_PATH) {
    return process.env.OCT_DB_PATH;
  }

  // Default to ~/.oct/db
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return `${homeDir}/.oct/db`;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const storagePath = getStoragePath();
  const adapter = new FileSystemStorageAdapter({ dbRoot: storagePath });

  // Initialize storage directories
  const initResult = await adapter.initialize();
  if (initResult.isErr()) {
    console.error('Failed to initialize storage:', initResult.error);
    process.exit(1);
  }

  try {
    await startMcpServer(adapter);
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();
