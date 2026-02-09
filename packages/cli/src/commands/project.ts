import { Command } from 'commander';
import {
  createProjectUseCase,
  getProjectUseCase,
  listProjectsUseCase,
  archiveProjectUseCase,
  type CreateProjectInput,
} from '@oct/core';
import type { StorageAdapter } from '@oct/core';
import { buildContext } from '../context/builder.js';
import { formatOutput, formatError } from '../output/formatter.js';

export function createProjectCommands(adapter: StorageAdapter) {
  const projectCmd = new Command('project');

  projectCmd
    .command('create')
    .description('Create a new project')
    .requiredOption('--name <name>', 'Project name')
    .option('--description <desc>', 'Project description')
    .option('--parent <parentId>', 'Parent project ID (for sub-projects)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const input: CreateProjectInput = {
        name: options.name,
        description: options.description,
        parentId: options.parent,
        employeeIds: [],
      };

      const result = await createProjectUseCase(ctx, input, adapter);

      if (result.isErr()) {
        console.error(formatError(result.error, options.json));
        process.exit(1);
      }

      console.log(formatOutput(result.value, options.json));
    });

  projectCmd
    .command('get')
    .description('Get a project by ID')
    .requiredOption('--id <id>', 'Project ID')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const result = await getProjectUseCase(ctx, { projectId: options.id }, adapter);

      if (result.isErr()) {
        console.error(formatError(result.error, options.json));
        process.exit(1);
      }

      console.log(formatOutput(result.value, options.json));
    });

  projectCmd
    .command('list')
    .description('List all projects')
    .option('--parent <parentId>', 'Filter by parent project')
    .option('--status <status>', 'Filter by status (active, archived, paused)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const result = await listProjectsUseCase(
        ctx,
        {
          filter: {
            parentId: options.parent,
            status: options.status,
          },
        },
        adapter
      );

      if (result.isErr()) {
        console.error(formatError(result.error, options.json));
        process.exit(1);
      }

      console.log(formatOutput(result.value, options.json));
    });

  projectCmd
    .command('archive')
    .description('Archive a project')
    .requiredOption('--id <id>', 'Project ID')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const result = await archiveProjectUseCase(ctx, { projectId: options.id }, adapter);

      if (result.isErr()) {
        console.error(formatError(result.error, options.json));
        process.exit(1);
      }

      console.log(formatOutput(result.value, options.json));
    });

  return projectCmd;
}
