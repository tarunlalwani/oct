#!/usr/bin/env node

import { Command } from 'commander';
import { FileSystemStorageAdapter } from '@oct/storage-fs';
import { createWorkerCommands } from './commands/worker.js';
import { createProjectCommands } from './commands/project.js';
import { createTaskCommands } from './commands/task.js';

const program = new Command();

program
  .name('oct')
  .description('OpenClaw Task Manager CLI')
  .version('0.1.0')
  .option('--db-path <path>', 'Database root directory', `${process.env.HOME}/.oct/db`)
  .option('--actor <workerId>', 'Actor worker ID for permissions')
  .option('--json', 'Output in JSON format');

// Parse global options first
program.parseOptions(process.argv);
const globalOpts = program.opts();

// Initialize storage adapter
const adapter = new FileSystemStorageAdapter({ dbRoot: globalOpts.dbPath });
await adapter.initialize();

// Build execution context from environment and CLI options
function buildContext() {
  const actorId = globalOpts.actor || process.env.OCT_ACTOR_ID || null;
  const permissions = process.env.OCT_PERMISSIONS?.split(',') || [
    'worker:*',
    'project:*',
    'task:*',
  ];

  return {
    actorId,
    workspaceId: process.env.OCT_WORKSPACE_ID || 'default',
    permissions,
    environment: 'local' as const,
    traceId: crypto.randomUUID(),
  };
}

// Add commands
program.addCommand(createWorkerCommands(adapter, buildContext));
program.addCommand(createProjectCommands(adapter, buildContext));
program.addCommand(createTaskCommands(adapter, buildContext));

// Parse arguments
program.parse();
