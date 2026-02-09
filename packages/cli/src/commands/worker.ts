import { Command } from 'commander';
import {
  createWorkerUseCase,
  listWorkersUseCase,
  getWorkerUseCase,
  updateWorkerUseCase,
  deleteWorkerUseCase,
  type ExecutionContext,
  type WorkerType,
} from '@oct/core';
import type { FileSystemStorageAdapter } from '@oct/storage-fs';

export function createWorkerCommands(
  adapter: FileSystemStorageAdapter,
  buildContext: () => ExecutionContext
) {
  const worker = new Command('worker');
  worker.description('Worker management commands');

  // Create worker
  worker
    .command('create')
    .description('Create a new worker')
    .requiredOption('--name <name>', 'Worker name')
    .requiredOption('--type <type>', 'Worker type (human or agent)')
    .option('--roles <roles>', 'Comma-separated roles', '')
    .option('--permissions <perms>', 'Comma-separated permissions', '')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await createWorkerUseCase(ctx, {
        name: options.name,
        type: options.type as WorkerType,
        roles: options.roles ? options.roles.split(',') : [],
        permissions: options.permissions ? options.permissions.split(',') : [],
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Created worker:', result.value.worker.workerId);
    });

  // List workers
  worker
    .command('list')
    .description('List all workers')
    .action(async () => {
      const ctx = buildContext();
      const result = await listWorkersUseCase(ctx, {}, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      for (const w of result.value.workers) {
        console.log(`${w.workerId} | ${w.name} | ${w.type} | ${w.roles.join(', ')}`);
      }
    });

  // Get worker
  worker
    .command('get')
    .description('Get worker by ID')
    .requiredOption('--id <id>', 'Worker ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await getWorkerUseCase(ctx, { workerId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log(JSON.stringify(result.value.worker, null, 2));
    });

  // Update worker
  worker
    .command('update')
    .description('Update worker')
    .requiredOption('--id <id>', 'Worker ID')
    .option('--name <name>', 'New name')
    .option('--roles <roles>', 'Comma-separated roles')
    .option('--permissions <perms>', 'Comma-separated permissions')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await updateWorkerUseCase(ctx, {
        workerId: options.id,
        name: options.name,
        roles: options.roles ? options.roles.split(',') : undefined,
        permissions: options.permissions ? options.permissions.split(',') : undefined,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Updated worker:', result.value.worker.workerId);
    });

  // Delete worker
  worker
    .command('delete')
    .description('Delete worker')
    .requiredOption('--id <id>', 'Worker ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await deleteWorkerUseCase(ctx, { workerId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Deleted worker:', options.id);
    });

  return worker;
}
