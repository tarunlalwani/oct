import { Command } from 'commander';
import {
  createProjectUseCase,
  listProjectsUseCase,
  getProjectUseCase,
  updateProjectUseCase,
  archiveProjectUseCase,
  deleteProjectUseCase,
  addProjectMemberUseCase,
  removeProjectMemberUseCase,
  type ExecutionContext,
} from '@oct/core';
import type { FileSystemStorageAdapter } from '@oct/storage-fs';

export function createProjectCommands(
  adapter: FileSystemStorageAdapter,
  buildContext: () => ExecutionContext
) {
  const project = new Command('project');
  project.description('Project management commands');

  // Create project
  project
    .command('create')
    .description('Create a new project')
    .requiredOption('--name <name>', 'Project name')
    .option('--description <desc>', 'Project description', '')
    .option('--parent <id>', 'Parent project ID')
    .option('--members <ids>', 'Comma-separated member worker IDs', '')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await createProjectUseCase(ctx, {
        name: options.name,
        description: options.description,
        parentId: options.parent,
        memberIds: options.members ? options.members.split(',') : [],
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Created project:', result.value.project.projectId);
    });

  // List projects
  project
    .command('list')
    .description('List all projects')
    .option('--status <status>', 'Filter by status (active or archived)')
    .option('--parent <id>', 'Filter by parent project ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await listProjectsUseCase(ctx, {
        filter: {
          status: options.status,
          parentId: options.parent,
        },
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      for (const p of result.value.projects) {
        console.log(`${p.projectId} | ${p.name} | ${p.status} | members: ${p.memberIds.length}`);
      }
    });

  // Get project
  project
    .command('get')
    .description('Get project by ID')
    .requiredOption('--id <id>', 'Project ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await getProjectUseCase(ctx, { projectId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log(JSON.stringify(result.value.project, null, 2));
    });

  // Update project
  project
    .command('update')
    .description('Update project')
    .requiredOption('--id <id>', 'Project ID')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await updateProjectUseCase(ctx, {
        projectId: options.id,
        name: options.name,
        description: options.description,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Updated project:', result.value.project.projectId);
    });

  // Archive project
  project
    .command('archive')
    .description('Archive project')
    .requiredOption('--id <id>', 'Project ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await archiveProjectUseCase(ctx, { projectId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Archived project:', result.value.project.projectId);
    });

  // Delete project
  project
    .command('delete')
    .description('Delete project')
    .requiredOption('--id <id>', 'Project ID')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await deleteProjectUseCase(ctx, { projectId: options.id }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Deleted project:', options.id);
    });

  // Add member
  project
    .command('add-member')
    .description('Add member to project')
    .requiredOption('--id <id>', 'Project ID')
    .requiredOption('--worker <workerId>', 'Worker ID to add')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await addProjectMemberUseCase(ctx, {
        projectId: options.id,
        workerId: options.worker,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Added member to project:', options.id);
    });

  // Remove member
  project
    .command('remove-member')
    .description('Remove member from project')
    .requiredOption('--id <id>', 'Project ID')
    .requiredOption('--worker <workerId>', 'Worker ID to remove')
    .action(async (options) => {
      const ctx = buildContext();
      const result = await removeProjectMemberUseCase(ctx, {
        projectId: options.id,
        workerId: options.worker,
      }, adapter);

      if (result.isErr()) {
        console.error('Error:', result.error.message);
        process.exit(1);
      }

      console.log('Removed member from project:', options.id);
    });

  return project;
}
