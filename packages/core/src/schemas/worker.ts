import { z } from 'zod';

/**
 * Worker schema - replaces Employee in v3
 * Simplified model with explicit permissions
 */

export const workerTypeSchema = z.enum(['human', 'agent']);

export type WorkerType = z.infer<typeof workerTypeSchema>;

/**
 * Permission constants for v3
 */
export const PERMISSIONS = {
  // Worker permissions
  WORKER_CREATE: 'worker:create',
  WORKER_READ: 'worker:read',
  WORKER_UPDATE: 'worker:update',
  WORKER_DELETE: 'worker:delete',

  // Project permissions
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_MANAGE_MEMBERS: 'project:manage-members',

  // Task permissions
  TASK_CREATE: 'task:create',
  TASK_READ: 'task:read',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_START: 'task:start',
  TASK_COMPLETE: 'task:complete',
  TASK_REOPEN: 'task:reopen',
  TASK_ASSIGN: 'task:assign',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const workerSchema = z.object({
  workerId: z.string(),
  name: z.string().min(1).max(256),
  type: workerTypeSchema,
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type Worker = z.infer<typeof workerSchema>;

/**
 * Create worker input schema
 */
export const createWorkerInputSchema = z.object({
  name: z.string().min(1).max(256),
  type: workerTypeSchema,
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
});

export type CreateWorkerInput = z.infer<typeof createWorkerInputSchema>;

/**
 * Update worker input schema
 */
export const updateWorkerInputSchema = z.object({
  workerId: z.string(),
  name: z.string().min(1).max(256).optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

export type UpdateWorkerInput = z.infer<typeof updateWorkerInputSchema>;
