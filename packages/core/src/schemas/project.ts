import { z } from 'zod';

/**
 * Project schema - v3 simplified
 */

export const projectStatusSchema = z.enum(['active', 'archived']);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().max(10000),
  parentId: z.string().nullable(),
  memberIds: z.array(z.string()),
  status: projectStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type Project = z.infer<typeof projectSchema>;

/**
 * Create project input schema
 */
export const createProjectInputSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(10000).default(''),
  parentId: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

/**
 * Update project input schema
 */
export const updateProjectInputSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(10000).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

/**
 * Archive project input schema
 */
export const archiveProjectInputSchema = z.object({
  projectId: z.string(),
});

export type ArchiveProjectInput = z.infer<typeof archiveProjectInputSchema>;

/**
 * Delete project input schema
 */
export const deleteProjectInputSchema = z.object({
  projectId: z.string(),
});

export type DeleteProjectInput = z.infer<typeof deleteProjectInputSchema>;

/**
 * Add project member input schema
 */
export const addProjectMemberInputSchema = z.object({
  projectId: z.string(),
  workerId: z.string(),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberInputSchema>;

/**
 * Remove project member input schema
 */
export const removeProjectMemberInputSchema = z.object({
  projectId: z.string(),
  workerId: z.string(),
});

export type RemoveProjectMemberInput = z.infer<typeof removeProjectMemberInputSchema>;

/**
 * List projects filter schema
 */
export const listProjectsFilterSchema = z.object({
  status: projectStatusSchema.optional(),
  parentId: z.string().optional(),
});

export type ListProjectsFilter = z.infer<typeof listProjectsFilterSchema>;
