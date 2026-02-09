import { z } from 'zod';
import { ok, err, type Result } from 'neverthrow';
import type { ExecutionContext } from '../../schemas/context.js';
import type { Project } from '../../schemas/project.js';
import type { DomainError } from '../../schemas/error.js';
import { createError } from '../../schemas/error.js';
import type { StorageAdapter } from '../../ports/storage-adapter.js';

export const updateProjectInputSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'paused']).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

export interface UpdateProjectOutput {
  project: Project;
}

export async function updateProjectUseCase(
  ctx: ExecutionContext,
  input: UpdateProjectInput,
  adapter: StorageAdapter
): Promise<Result<UpdateProjectOutput, DomainError>> {
  // Authentication check
  if (ctx.actorId === null) {
    return err(createError('UNAUTHORIZED', 'Authentication required', false));
  }

  // Authorization check
  if (!ctx.permissions.includes('project:update')) {
    return err(createError('FORBIDDEN', 'Missing permission: project:update', false));
  }

  // Get existing project
  const projectResult = await adapter.getProject(input.projectId);
  if (projectResult.isErr()) return err(projectResult.error);
  if (!projectResult.value) {
    return err(createError('NOT_FOUND', `Project not found: ${input.projectId}`, false));
  }

  const project = projectResult.value;

  // Check for conflicts when archiving
  if (input.status === 'archived' && project.status !== 'archived') {
    // Get all tasks in project
    const tasksResult = await adapter.getTasksByProject(input.projectId);
    if (tasksResult.isErr()) return err(tasksResult.error);

    const incompleteTasks = tasksResult.value.filter(t => t.status !== 'done');
    if (incompleteTasks.length > 0) {
      return err(createError('CONFLICT', `Cannot archive project with ${incompleteTasks.length} incomplete tasks`, false));
    }

    // Archive sub-projects recursively
    const subProjectsResult = await adapter.getSubProjects(input.projectId);
    if (subProjectsResult.isErr()) return err(subProjectsResult.error);

    for (const subProject of subProjectsResult.value) {
      if (subProject.status !== 'archived') {
        const archiveResult = await adapter.saveProject({
          ...subProject,
          status: 'archived',
          updatedAt: new Date().toISOString(),
        });
        if (archiveResult.isErr()) return err(archiveResult.error);
      }
    }
  }

  const now = new Date().toISOString();
  const updatedProject: Project = {
    ...project,
    name: input.name ?? project.name,
    description: input.description !== undefined ? input.description : project.description,
    status: input.status ?? project.status,
    updatedAt: now,
  };

  const saveResult = await adapter.saveProject(updatedProject);
  if (saveResult.isErr()) {
    return err(saveResult.error);
  }

  return ok({ project: updatedProject });
}
