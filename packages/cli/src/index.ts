#!/usr/bin/env node

import { Command } from 'commander';
import { FileSystemStorageAdapter } from '@oct/storage-fs';
import { createProjectCommands } from './commands/project.js';
import { createEmployeeCommands } from './commands/employee.js';
import { createTemplateCommands } from './commands/template.js';

const program = new Command();

program
  .name('oct')
  .description('OpenClaw Task Manager CLI')
  .version('0.1.0')
  .option('--tm-root <path>', 'Database root directory');

// Initialize storage adapter
const dbRoot = process.env.TM_ROOT_DB || `${process.env.HOME}/.oct/db`;
const adapter = new FileSystemStorageAdapter({ dbRoot });

// Initialize adapter
await adapter.initialize();

// Add commands
program.addCommand(createProjectCommands(adapter));
program.addCommand(createEmployeeCommands(adapter));
program.addCommand(createTemplateCommands(adapter));

// Parse arguments
program.parse();
