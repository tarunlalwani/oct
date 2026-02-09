import { Command } from 'commander';
import {
  createEmployeeUseCase,
  getEmployeeUseCase,
  listEmployeesUseCase,
  type CreateEmployeeInput,
} from '@oct/core';
import type { StorageAdapter } from '@oct/core';
import { buildContext } from '../context/builder.js';
import { formatOutput, formatError } from '../output/formatter.js';

export function createEmployeeCommands(adapter: StorageAdapter) {
  const employeeCmd = new Command('employee');

  employeeCmd
    .command('create')
    .description('Create a new employee')
    .requiredOption('--name <name>', 'Employee name')
    .requiredOption('--kind <kind>', 'Employee kind (human or ai)')
    .option('--template <templateId>', 'Template ID for role defaults')
    .option('--can-execute', 'Can execute tasks', true)
    .option('--can-create', 'Can create tasks', true)
    .option('--can-auto-approve', 'Can auto-approve own work', false)
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const input: CreateEmployeeInput = {
        name: options.name,
        kind: options.kind,
        templateId: options.template,
        capabilities: {
          canExecuteTasks: options.canExecute,
          canCreateTasks: options.canCreate,
          canAutoApprove: options.canAutoApprove,
        },
      };

      const result = await createEmployeeUseCase(ctx, input, adapter);

      if (result.isErr()) {
        console.error(formatError(result.error, options.json));
        process.exit(1);
      }

      console.log(formatOutput(result.value, options.json));
    });

  employeeCmd
    .command('get')
    .description('Get an employee by ID')
    .requiredOption('--id <id>', 'Employee ID')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const result = await getEmployeeUseCase(ctx, { employeeId: options.id }, adapter);

      if (result.isErr()) {
        console.error(formatError(result.error, options.json));
        process.exit(1);
      }

      console.log(formatOutput(result.value, options.json));
    });

  employeeCmd
    .command('list')
    .description('List all employees')
    .option('--kind <kind>', 'Filter by kind (human or ai)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ctx = await buildContext();
      const result = await listEmployeesUseCase(
        ctx,
        {
          filter: {
            kind: options.kind,
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

  return employeeCmd;
}
