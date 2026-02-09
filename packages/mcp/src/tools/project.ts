import type { StorageAdapter, DomainError, Project } from '@oct/core';
import {
  createProjectUseCase,
  listProjectsUseCase,
  getProjectUseCase,
  createError,
} from '@oct/core';
import { buildMcpContext, formatSuccess, formatError } from '../utils.js';

/**
 * MCP Tool: oct_project_create
 * Create a new project
 */
export async function handleProjectCreate(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  if (!args.name || typeof args.name !== 'string') {
    return formatError(createError('INVALID_INPUT', 'name is required'));
  }

  const result = await createProjectUseCase(
    ctx,
    {
      name: args.name,
      description: typeof args.description === 'string' ? args.description : '',
      parentId: typeof args.parentId === 'string' ? args.parentId : undefined,
      memberIds: Array.isArray(args.memberIds) ? args.memberIds.map(String) : [],
    },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  const { project } = result.value;
  return formatSuccess({
    projectId: project.projectId,
    name: project.name,
    status: project.status,
    createdAt: project.createdAt,
  });
}

/**
 * MCP Tool: oct_project_list
 * List all projects with optional filters
 */
export async function handleProjectList(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  const result = await listProjectsUseCase(
    ctx,
    {
      filter: {
        status: args.status === 'active' || args.status === 'archived' ? args.status : undefined,
        parentId: typeof args.parentId === 'string' ? args.parentId : undefined,
      },
    },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  return formatSuccess({
    projects: result.value.projects.map((p: Project) => ({
      projectId: p.projectId,
      name: p.name,
      description: p.description,
      status: p.status,
      parentId: p.parentId,
      memberIds: p.memberIds,
      createdAt: p.createdAt,
    })),
  });
}

/**
 * MCP Tool: oct_project_get
 * Get project by ID
 */
export async function handleProjectGet(
  args: Record<string, unknown>,
  adapter: StorageAdapter
): Promise<{ content: Array<{ type: 'text'; text: string }> } | { content: Array<{ type: 'text'; text: string }>; isError: true }> {
  const ctx = buildMcpContext();

  if (!args.projectId || typeof args.projectId !== 'string') {
    return formatError(createError('INVALID_INPUT', 'projectId is required'));
  }

  const result = await getProjectUseCase(
    ctx,
    { projectId: args.projectId },
    adapter
  );

  if (result.isErr()) {
    return formatError(result.error);
  }

  const { project } = result.value;
  return formatSuccess({
    projectId: project.projectId,
    name: project.name,
    description: project.description,
    status: project.status,
    parentId: project.parentId,
    memberIds: project.memberIds,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}
