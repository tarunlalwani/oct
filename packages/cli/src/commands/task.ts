import { Command } from 'commander';
import {
  createTaskUseCase,
  getTaskUseCase,
  runTaskUseCase,
  listTasksUseCase,
  createTaskInputSchema,
  getTaskInputSchema,
  runTaskInputSchema,
  listTasksInputSchema,
  createError,
  type CreateTaskOutput,
  type GetTaskOutput,
  type RunTaskOutput,
  type ListTasksOutput,
} from '@oct/core';
import { InMemoryTaskRepositoryFactory } from '@oct/infra';
import { buildExecutionContext } from '../context/builder.js';
import { createFormatter, getExitCode } from '../output/formatter.js';
import { createApiClient } from '../api/client.js';

const repoFactory = new InMemoryTaskRepositoryFactory();

export function createTaskCommand(program: Command): void {
  const taskCmd = program
    .command('task')
    .description('Task management commands');

  // Create task
  taskCmd
    .command('create')
    .description('Create a new task')
    .requiredOption('--title <title>', 'Task title')
    .option('--description <description>', 'Task description')
    .option('--json', 'Output in JSON format')
    .option('--remote', 'Use remote API instead of local Core')
    .action(async (options) => {
      const ctx = buildExecutionContext();
      const formatter = createFormatter<CreateTaskOutput>(options.json);

      const parseResult = createTaskInputSchema.safeParse({
        title: options.title,
        description: options.description,
      });

      if (!parseResult.success) {
        const error = createError('INVALID_INPUT', parseResult.error.errors[0]?.message || 'Invalid input', false);
        formatter.error(error);
        process.exit(getExitCode(error.code));
        return;
      }

      let result;
      if (options.remote) {
        const client = createApiClient(ctx);
        result = await client.createTask(parseResult.data);
      } else {
        const repository = repoFactory.createRepository(ctx.workspaceId);
        result = await createTaskUseCase(ctx, parseResult.data, repository);
      }

      if (result.isErr()) {
        formatter.error(result.error);
        process.exit(getExitCode(result.error.code));
      }

      formatter.success(result.value);
    });

  // Get task
  taskCmd
    .command('get')
    .description('Get a task by ID')
    .requiredOption('--id <id>', 'Task ID')
    .option('--json', 'Output in JSON format')
    .option('--remote', 'Use remote API instead of local Core')
    .action(async (options) => {
      const ctx = buildExecutionContext();
      const formatter = createFormatter<GetTaskOutput>(options.json);

      const parseResult = getTaskInputSchema.safeParse({
        taskId: options.id,
      });

      if (!parseResult.success) {
        const error = createError('INVALID_INPUT', parseResult.error.errors[0]?.message || 'Invalid input', false);
        formatter.error(error);
        process.exit(getExitCode(error.code));
        return;
      }

      let result;
      if (options.remote) {
        const client = createApiClient(ctx);
        result = await client.getTask(parseResult.data);
      } else {
        const repository = repoFactory.createRepository(ctx.workspaceId);
        result = await getTaskUseCase(ctx, parseResult.data, repository);
      }

      if (result.isErr()) {
        formatter.error(result.error);
        process.exit(getExitCode(result.error.code));
      }

      formatter.success(result.value);
    });

  // Run task
  taskCmd
    .command('run')
    .description('Run a task')
    .requiredOption('--id <id>', 'Task ID')
    .option('--json', 'Output in JSON format')
    .option('--remote', 'Use remote API instead of local Core')
    .action(async (options) => {
      const ctx = buildExecutionContext();
      const formatter = createFormatter<RunTaskOutput>(options.json);

      const parseResult = runTaskInputSchema.safeParse({
        taskId: options.id,
      });

      if (!parseResult.success) {
        const error = createError('INVALID_INPUT', parseResult.error.errors[0]?.message || 'Invalid input', false);
        formatter.error(error);
        process.exit(getExitCode(error.code));
        return;
      }

      let result;
      if (options.remote) {
        const client = createApiClient(ctx);
        result = await client.runTask(parseResult.data);
      } else {
        const repository = repoFactory.createRepository(ctx.workspaceId);
        result = await runTaskUseCase(ctx, parseResult.data, repository);
      }

      if (result.isErr()) {
        formatter.error(result.error);
        process.exit(getExitCode(result.error.code));
      }

      formatter.success(result.value);
    });

  // List tasks
  taskCmd
    .command('list')
    .description('List tasks')
    .option('--limit <limit>', 'Maximum number of tasks', '50')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--json', 'Output in JSON format')
    .option('--remote', 'Use remote API instead of local Core')
    .action(async (options) => {
      const ctx = buildExecutionContext();
      const formatter = createFormatter<ListTasksOutput>(options.json);

      const parseResult = listTasksInputSchema.safeParse({
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
        cursor: options.cursor,
      });

      if (!parseResult.success) {
        const error = createError('INVALID_INPUT', parseResult.error.errors[0]?.message || 'Invalid input', false);
        formatter.error(error);
        process.exit(getExitCode(error.code));
        return;
      }

      let result;
      if (options.remote) {
        const client = createApiClient(ctx);
        result = await client.listTasks(parseResult.data);
      } else {
        const repository = repoFactory.createRepository(ctx.workspaceId);
        result = await listTasksUseCase(ctx, parseResult.data, repository);
      }

      if (result.isErr()) {
        formatter.error(result.error);
        process.exit(getExitCode(result.error.code));
      }

      formatter.success(result.value);
    });
}
