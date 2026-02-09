import { Command } from 'commander';
import {
  createTemplateUseCase,
  listTemplatesUseCase,
  type CreateTemplateInput,
} from '@oct/core';
import type { StorageAdapter } from '@oct/core';
import { buildContext } from '../context/builder.js';
import { formatOutput, formatError } from '../output/formatter.js';

export function createTemplateCommands(adapter: StorageAdapter) {
  const templateCmd = new Command('template');

  templateCmd
    .command('create')
    .description('Create a new employee template')
    .requiredOption('--name <name>', 'Template name')
    .requiredOption('--kind <kind>', 'Employee kind (human or ai)')
    .option('--description <desc>', 'Template description')
    .option('--can-execute', 'Default can execute tasks', true)
    .option('--can-create', 'Default can create tasks', true)
    .option('--can-auto-approve', 'Default can auto-approve', false)
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const input: CreateTemplateInput = {
        name: options.name,
        kind: options.kind,
        description: options.description,
        defaultCapabilities: {
          canExecuteTasks: options.canExecute,
          canCreateTasks: options.canCreate,
          canAutoApprove: options.canAutoApprove,
        },
        skills: [],
      };

      const result = await createTemplateUseCase(ctx, input, adapter);

      if (result.isErr()) {
        console.error(formatError(result.error, options.json));
        process.exit(1);
      }

      console.log(formatOutput(result.value, options.json));
    });

  templateCmd
    .command('list')
    .description('List all templates')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const result = await listTemplatesUseCase(ctx, {}, adapter);

      if (result.isErr()) {
        console.error(formatError(result.error, options.json));
        process.exit(1);
      }

      console.log(formatOutput(result.value, options.json));
    });

  return templateCmd;
}
