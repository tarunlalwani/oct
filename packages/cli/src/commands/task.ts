import { Command } from 'commander';
import {
  createTaskUseCase,
  listTasksUseCase,
  getTaskUseCase,
  updateTaskUseCase,
  moveTaskUseCase,
  deleteTaskUseCase,
  startTaskUseCase,
  completeTaskUseCase,
  reopenTaskUseCase,
  assignTaskUseCase,
  getReadyTasksUseCase,
  getBlockedTasksUseCase,
  getProjectStatsUseCase,
  getWorkerWorkloadUseCase,
  type ExecutionContext,
} from '@oct/core';
import type { FileSystemStorageAdapter } from '@oct/storage-fs';

export function createTaskCommands(
  adapter: FileSystemStorageAdapter,
  buildContext: () => ExecutionContext
) {
  const task = new Command('task');
  task.description('Task management commands');

  // Create task
  task
    .command('create')
    .description('Create a new task')
    .requiredOption('--project <id>', 'Project ID')
    .requiredOption('--title <title>', 'Task title')
    .requiredOption('--worker <id>', 'Owner worker ID')
    .option('--description <desc>', 'Task description', '')
    .option('--priority <n>', 'Priority (1-4, 1=highest)', '2')
    .option('--deps <ids>', 'Comma-separated dependency task IDs', '')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await createTaskUseCase(ctx, {
        projectId: options.project,
        title: options.title,
        description: options.description,
        ownerId: options.worker,
        priority: parseInt(options.priority, 10),
        dependencies: options.deps ? options.deps.split(',') : [],
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Created task:', result.value.task.taskId);
    });

  // List tasks
  task
    .command('list')
    .description('List all tasks')
    .option('--project <id>', 'Filter by project ID')
    .option('--worker <id>', 'Filter by owner worker ID')
    .option('--status <status>', 'Filter by status')
    .option('--priority <n>', 'Filter by priority')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await listTasksUseCase(ctx, {
        filter: {
          projectId: options.project,
          ownerId: options.worker,
          status: options.status,
          priority: options.priority ? parseInt(options.priority, 10) : undefined,
        },
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      for (const t of result.value.tasks) {
        console.log(`${t.taskId} | ${t.title} | ${t.status} | P${t.priority} | ${t.ownerId}`);
      }
    });

  // Get task
  task
    .command('get')
    .description('Get task by ID')
    .requiredOption('--id <id>', 'Task ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await getTaskUseCase(ctx, { taskId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log(JSON.stringify(result.value.task, null, 2));
    });

  // Update task
  task
    .command('update')
    .description('Update task')
    .requiredOption('--id <id>', 'Task ID')
    .option('--title <title>', 'New title')
    .option('--description <desc>', 'New description')
    .option('--priority <n>', 'New priority (1-4)')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await updateTaskUseCase(ctx, {
        taskId: options.id,
        title: options.title,
        description: options.description,
        priority: options.priority ? parseInt(options.priority, 10) : undefined,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Updated task:', result.value.task.taskId);
    });

  // Move task
  task
    .command('move')
    .description('Move task to different project')
    .requiredOption('--id <id>', 'Task ID')
    .requiredOption('--project <id>', 'New project ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await moveTaskUseCase(ctx, {
        taskId: options.id,
        newProjectId: options.project,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Moved task:', result.value.task.taskId);
    });

  // Delete task
  task
    .command('delete')
    .description('Delete task')
    .requiredOption('--id <id>', 'Task ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await deleteTaskUseCase(ctx, { taskId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Deleted task:', options.id);
    });

  // Start task
  task
    .command('start')
    .description('Start working on a task')
    .requiredOption('--id <id>', 'Task ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await startTaskUseCase(ctx, { taskId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Started task:', result.value.task.taskId);
    });

  // Complete task
  task
    .command('complete')
    .description('Complete a task')
    .requiredOption('--id <id>', 'Task ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await completeTaskUseCase(ctx, { taskId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Completed task:', result.value.task.taskId);
    });

  // Reopen task
  task
    .command('reopen')
    .description('Reopen a completed task')
    .requiredOption('--id <id>', 'Task ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await reopenTaskUseCase(ctx, { taskId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Reopened task:', result.value.task.taskId);
    });

  // Assign task
  task
    .command('assign')
    .description('Assign task to different worker')
    .requiredOption('--id <id>', 'Task ID')
    .requiredOption('--worker <id>', 'New owner worker ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await assignTaskUseCase(ctx, {
        taskId: options.id,
        workerId: options.worker,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Assigned task:', result.value.task.taskId);
    });

  // Ready tasks
  task
    .command('ready')
    .description('List tasks ready to be started')
    .option('--project <id>', 'Filter by project ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await getReadyTasksUseCase(ctx, {
        projectId: options.project,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      for (const t of result.value.tasks) {
        console.log(`${t.taskId} | ${t.title} | P${t.priority} | ${t.ownerId}`);
      }
    });

  // Blocked tasks
  task
    .command('blocked')
    .description('List blocked tasks with their blockers')
    .option('--project <id>', 'Filter by project ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await getBlockedTasksUseCase(ctx, {
        projectId: options.project,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      for (const info of result.value.tasks) {
        console.log(`${info.task.taskId} | ${info.task.title}`);
        console.log('  Blocked by:');
        for (const blocker of info.blockers) {
          console.log(`    - ${blocker.taskId}: ${blocker.title} (${blocker.status})`);
        }
      }
    });

  // Project stats
  task
    .command('stats')
    .description('Show project statistics')
    .requiredOption('--project <id>', 'Project ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await getProjectStatsUseCase(ctx, {
        projectId: options.project,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      const stats = result.value.stats;
      console.log(`Project: ${stats.projectId}`);
      console.log(`Total tasks: ${stats.totalTasks}`);
      console.log(`Completion: ${stats.completionPercentage}%`);
      console.log('By status:', stats.tasksByStatus);
      console.log('By priority:', stats.tasksByPriority);
    });

  // Worker workload
  task
    .command('workload')
    .description('Show worker workload')
    .requiredOption('--worker <id>', 'Worker ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await getWorkerWorkloadUseCase(ctx, {
        workerId: options.worker,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      const workload = result.value.workload;
      console.log(`Worker: ${workload.workerId}`);
      console.log(`Total tasks: ${workload.totalTasks}`);
      console.log(`High priority (P1/P2): ${workload.highPriorityTasks}`);
      console.log('By status:', workload.tasksByStatus);
    });

  return task;
}
