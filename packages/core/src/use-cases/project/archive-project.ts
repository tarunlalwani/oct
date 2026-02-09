import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export interface ArchiveProjectInput {
  projectId: string;
}

export interface ArchiveProjectOutput {
  project: Project;
}

export async function archiveProjectUseCase(
  ctx: ExecutionContext,
  input: ArchiveProjectInput,
  adapter: StorageAdapter
): Promise<Result<ArchiveProjectOutput, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('project:archive')) {
    return err(createError('FORBIDDEN', 'Missing permission: project:archive', false));
  }

  // Get existing project
  const projectResult = await adapter.getProject(input.projectId);
  if (projectResult.isErr()) return err(projectResult.error);
  if (!projectResult.value) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  const project = projectResult.value;

  // Check for incomplete tasks
  const tasksResult = await adapter.getTasksByProject(input.projectId);
  if (tasksResult.isErr()) return err(tasksResult.error);

  const incompleteTasks = tasksResult.value.filter(t => t.status !== 'done');
  if (incompleteTasks.length > 0) {
    return err(createError('CONFLICT', `Cannot archive project with ${incompleteTasks.length} incomplete tasks`, false));
  }

  const now = new Date().toISOString();

  // Archive sub-projects recursively
  const subProjectsResult = await adapter.getSubProjects(input.projectId);
  if (subProjectsResult.isErr()) return err(subProjectsResult.error);

  for (const subProject of subProjectsResult.value) {
    if (subProject.status !== 'archived') {
      const archiveResult = await adapter.saveProject({
        ...subProject,
        status: 'archived',
        updatedAt: now,
      });
      if (archiveResult.isErr()) return err(archiveResult.error);
    }
  }

  // Archive the project itself
  const updatedProject: Project = {
    ...project,
    status: 'archived',
    updatedAt: now,
  };

  const saveResult = await adapter.saveProject(updatedProject);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ project: updatedProject });
}
