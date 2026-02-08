#!/usr/bin/env node

import { Command } from 'commander';
import { createTaskCommand } from './commands/task.js';

const program = new Command();

program
  .name('oct')
  .description('OpenClaw Task Manager CLI')
  .version('0.1.0');

// Add task commands
createTaskCommand(program);

// Parse arguments
program.parse();
