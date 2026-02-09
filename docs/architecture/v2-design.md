# OCT v2 Architecture Design Document

## Overview

This document defines the architecture for OCT (Operational Control Terminal) v2, a task management system designed for AI agents and human collaboration. The architecture follows clean architecture principles with clear separation between domain logic, use cases, and infrastructure.

---

## 1. Storage Adapter Interface

The Storage Adapter provides a unified interface for all persistence operations. This enables pluggable storage backends (file system, database, etc.).

```typescript
// packages/core/src/ports/storage-adapter.ts

import type { Result } from 'neverthrow';
import type { DomainError } from '../schemas/error.js';
import type { Project } from '../domain/project.js';
import type { Employee } from '../domain/employee.js';
import type { EmployeeTemplate } from '../domain/template.js';
import type { Task } from '../domain/task.js';

// Filter types for list operations
export interface ProjectFilter {
  status?: 'active' | 'archived' | 'paused';
  parentId?: string | null;
  employeeId?: string;
}

export interface EmployeeFilter {
  kind?: 'human' | 'ai';
  templateId?: string;
}

export interface TaskFilter {
  projectId?: string;
  ownerId?: string;
  status?: TaskStatus;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
}

export interface StorageAdapter {
  // Projects
  getProject(id: string): Promise<Result<Project | null, DomainError>>;
  saveProject(project: Project): Promise<Result<void, DomainError>>;
  deleteProject(id: string): Promise<Result<void, DomainError>>;
  listProjects(filter?: ProjectFilter): Promise<Result<Project[], DomainError>>;
  getSubProjects(parentId: string): Promise<Result<Project[], DomainError>>;

  // Employees
  getEmployee(id: string): Promise<Result<Employee | null, DomainError>>;
  saveEmployee(employee: Employee): Promise<Result<void, DomainError>>;
  deleteEmployee(id: string): Promise<Result<void, DomainError>>;
  listEmployees(filter?: EmployeeFilter): Promise<Result<Employee[], DomainError>>;

  // Templates
  getTemplate(id: string): Promise<Result<EmployeeTemplate | null, DomainError>>;
  saveTemplate(template: EmployeeTemplate): Promise<Result<void, DomainError>>;
  deleteTemplate(id: string): Promise<Result<void, DomainError>>;
  listTemplates(): Promise<Result<EmployeeTemplate[], DomainError>>;

  // Tasks
  getTask(id: string): Promise<Result<Task | null, DomainError>>;
  saveTask(task: Task): Promise<Result<void, DomainError>>;
  deleteTask(id: string): Promise<Result<void, DomainError>>;
  listTasks(filter?: TaskFilter): Promise<Result<Task[], DomainError>>;
  getTasksByProject(projectId: string): Promise<Result<Task[], DomainError>>;
  getTasksByOwner(employeeId: string): Promise<Result<Task[], DomainError>>;
  getTasksByDependency(taskId: string): Promise<Result<Task[], DomainError>>;

  // Transactions (for atomic operations)
  transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<Result<T, DomainError>>;
}

export interface StorageAdapterFactory {
  createAdapter(workspaceId: string): StorageAdapter;
}
```

---

## 2. Entity Relationships

### 2.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY RELATIONSHIPS                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────────┐
│   Project    │◄───────┤   Project    │◄────────┤     Project      │
│   (root)     │ 1    *  │  (child)     │  1    * │    (sub-task)    │
└──────┬───────┘         └──────┬───────┘         └──────────────────┘
       │                        │
       │ 1                      │ 1
       │                        │
       ▼ *                      ▼ *
┌──────────────┐         ┌──────────────┐
│     Task     │         │     Task     │
│              │         │              │
│ - taskId     │         │ - taskId     │
│ - projectId  │         │ - projectId  │
│ - ownerId ───┼────┐    │ - ownerId ───┼────┐
│ - dependencies│    │    │ - blockedBy  │    │
└──────────────┘    │    └──────────────┘    │
       ▲            │           ▲            │
       │            │           │            │
       │ *          │           │ *          │
       │            │           │            │
┌──────┴───────┐    │    ┌──────┴───────┐    │
│   Employee   │◄───┘    │   Employee   │◄───┘
│              │ 1       │              │ 1
│ - employeeId │         │ - employeeId │
│ - templateId─┼──┐      │ - templateId─┼──┐
└──────────────┘  │      └──────────────┘  │
                  │                        │
                  │ *                      │ *
                  ▼                        ▼
         ┌────────────────┐      ┌────────────────┐
         │EmployeeTemplate│      │EmployeeTemplate│
         │                │      │                │
         │ - templateId   │      │ - templateId   │
         │ - defaultCaps  │      │ - defaultCaps  │
         └────────────────┘      └────────────────┘

### 2.2 Relationship Definitions

| Relationship | Type | Cardinality | Description |
|--------------|------|-------------|-------------|
| Project → Task | Composition | 1:* | A project contains many tasks; tasks cannot exist without a project |
| Project → Project | Self-reference | 1:* | Projects can have sub-projects (tree structure) |
| Employee → Task | Ownership | 1:* | An employee owns many tasks; each task has one owner |
| EmployeeTemplate → Employee | Inheritance | 1:* | Templates define defaults for many employees |
| Task → Task | Dependency | *:* | Tasks can depend on other tasks (DAG structure) |

### 2.3 Dependency Graph Rules

```
Valid Dependency Graph (DAG):

    Task A (done)
       │
       ▼
    Task B (in_progress)
       │
       ├──► Task C (blocked)
       │
       └──► Task D (blocked)

Invalid (Circular):

    Task A ◄──────┐
       │          │
       ▼          │
    Task B ──────►│
       │          │
       ▼          │
    Task C ───────┘
```

---

## 3. Dependency Management Strategy

### 3.1 Dependency Rules

1. **Status Blocking**: A task cannot transition to `in_progress` if any dependency is not `done`
2. **Auto-Unblocking**: When a dependency is marked `done`, dependent tasks with all dependencies satisfied auto-transition from `blocked` to `todo`
3. **Circular Prevention**: The system must prevent circular dependencies at creation/update time
4. **Computed Field**: `blockedBy` is computed from `dependencies` and current task statuses

### 3.2 Status Transition Rules

```
                    ┌─────────────────────────────────────┐
                    │           STATUS FLOW               │
                    └─────────────────────────────────────┘

    ┌─────────┐     ┌─────────┐     ┌─────────────┐
    │ backlog │────►│  todo   │────►│ in_progress │
    └─────────┘     └────┬────┘     └──────┬──────┘
                         │                 │
                         │ (dependencies   │
                         │  not done)      │ (ready for
                         ▼                 │  review)
                    ┌─────────┐            ▼
                    │ blocked │◄────  ┌──────────┐
                    └────┬────┘       │ in_review│
                         │            └────┬─────┘
                         │                 │
                         │ (dependency     │ (approved/
                         │  completed)     │  rejected)
                         └────────────────►│
                                           ▼
                                     ┌─────────┐
                                     │  done   │
                                     └─────────┘
```

### 3.3 Auto-Update Algorithm

```typescript
// When a task is marked as done:
async function onTaskCompleted(
  completedTaskId: string,
  adapter: StorageAdapter
): Promise<Result<void, DomainError>> {
  // 1. Find all tasks that depend on the completed task
  const dependentsResult = await adapter.getTasksByDependency(completedTaskId);

  // 2. For each dependent task
  for (const dependent of dependents) {
    // 3. Check if all dependencies are now done
    const allDepsDone = await checkAllDependenciesDone(dependent, adapter);

    if (allDepsDone && dependent.status === 'blocked') {
      // 4. Auto-transition to todo
      await updateTaskStatus(dependent, 'todo');
    }
  }
}

async function checkAllDependenciesDone(
  task: Task,
  adapter: StorageAdapter
): Promise<boolean> {
  for (const depId of task.dependencies) {
    const depResult = await adapter.getTask(depId);
    if (depResult.isErr() || !depResult.value || depResult.value.status !== 'done') {
      return false;
    }
  }
  return true;
}
```

### 3.4 Cycle Detection Algorithm

```typescript
// DFS-based cycle detection for task dependencies
function detectCycle(
  taskId: string,
  dependencies: Map<string, string[]>
): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const deps = dependencies.get(node) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true;
      } else if (recursionStack.has(dep)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(node);
    return false;
  }

  return hasCycle(taskId);
}

// Usage in createTask/updateTask:
async function validateNoCycle(
  newTaskId: string,
  newDependencies: string[],
  adapter: StorageAdapter
): Promise<Result<void, DomainError>> {
  // Build dependency map including the new task
  const allTasks = await adapter.listTasks();
  const depMap = new Map<string, string[]>();

  for (const task of allTasks) {
    depMap.set(task.taskId, task.dependencies);
  }
  depMap.set(newTaskId, newDependencies);

  if (detectCycle(newTaskId, depMap)) {
    return err(createError('CONFLICT', 'Circular dependency detected'));
  }

  return ok(undefined);
}
```

### 3.5 Project Hierarchy Cycle Detection

```typescript
// Similar algorithm for project parent-child relationships
function detectProjectCycle(
  projectId: string,
  parentId: string | null,
  projects: Map<string, Project>
): boolean {
  if (!parentId) return false;

  const visited = new Set<string>();
  let current = parentId;

  while (current) {
    if (current === projectId) return true; // Would create cycle
    if (visited.has(current)) return true;  // Existing cycle
    visited.add(current);

    const parent = projects.get(current);
    current = parent?.parentId || null;
  }

  return false;
}
```

---

## 4. File System Storage Design

### 4.1 Directory Structure

```
${TM_ROOT_DB:-~/.oct/db/}
├── projects/
│   ├── proj-<uuid>.json
│   └── ...
├── employees/
│   ├── emp-<uuid>.json
│   └── ...
├── templates/
│   ├── tmpl-<uuid>.json
│   └── ...
└── tasks/
    ├── task-<uuid>.json
    └── ...
```

### 4.2 File Naming Conventions

| Entity | Prefix | Example | Pattern |
|--------|--------|---------|---------|
| Project | `proj-` | `proj-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.json` | `{prefix}{uuidv7}.json` |
| Employee | `emp-` | `emp-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.json` | `{prefix}{uuidv7}.json` |
| Template | `tmpl-` | `tmpl-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.json` | `{prefix}{uuidv7}.json` |
| Task | `task-` | `task-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.json` | `{prefix}{uuidv7}.json` |

### 4.3 File Content Format

Each file contains a single JSON object with the entity data:

```json
{
  "taskId": "task-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
  "projectId": "proj-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
  "title": "Implement feature X",
  "type": "feature",
  "ownerId": "emp-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
  "context": "Background info",
  "goal": "What to achieve",
  "deliverable": "Expected output",
  "status": "todo",
  "priority": "P1",
  "dependencies": ["task-018f3b8a-7c4d-7e8f-9a0b-111111111111"],
  "blockedBy": [],
  "approval": null,
  "metadata": {},
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 4.4 Locking Mechanism

Simple file-based locking for single-user CLI scenarios:

```typescript
// packages/storage-fs/src/lock.ts

import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';

interface LockOptions {
  retryDelayMs: number;
  maxRetries: number;
}

class FileLock {
  private lockFile: string;
  private options: LockOptions;

  constructor(lockFile: string, options: LockOptions = { retryDelayMs: 100, maxRetries: 50 }) {
    this.lockFile = lockFile;
    this.options = options;
  }

  async acquire(): Promise<void> {
    for (let i = 0; i < this.options.maxRetries; i++) {
      try {
        // Try to create lock file with exclusive flag
        await writeFile(this.lockFile, process.pid.toString(), { flag: 'wx' });
        return;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
          // Lock exists, check if stale
          const isStale = await this.isStaleLock();
          if (isStale) {
            await this.forceRelease();
            continue;
          }
          // Wait and retry
          await new Promise(r => setTimeout(r, this.options.retryDelayMs));
        } else {
          throw err;
        }
      }
    }
    throw new Error(`Could not acquire lock after ${this.options.maxRetries} retries`);
  }

  async release(): Promise<void> {
    try {
      await unlink(this.lockFile);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  private async isStaleLock(): Promise<boolean> {
    try {
      const pid = parseInt(await readFile(this.lockFile, 'utf-8'), 10);
      // Check if process is still running (platform-specific)
      try {
        process.kill(pid, 0);
        return false; // Process exists
      } catch {
        return true; // Process doesn't exist
      }
    } catch {
      return true; // Can't read lock file
    }
  }

  private async forceRelease(): Promise<void> {
    try {
      await unlink(this.lockFile);
    } catch {
      // Ignore errors
    }
  }
}
```

### 4.5 Atomic Write Strategy

```typescript
// packages/storage-fs/src/atomic-write.ts

import { writeFile, rename, unlink } from 'fs/promises';
import { join, dirname } from 'path';

async function atomicWriteFile(
  filePath: string,
  content: string
): Promise<void> {
  const tempPath = `${filePath}.tmp.${process.pid}`;

  try {
    // Write to temp file
    await writeFile(tempPath, content, 'utf-8');

    // Atomic rename
    await rename(tempPath, filePath);
  } catch (err) {
    // Clean up temp file on error
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

// Usage in storage adapter:
async function saveEntity<T extends { [key: string]: unknown }>(
  dir: string,
  id: string,
  entity: T
): Promise<Result<void, DomainError>> {
  const filePath = join(dir, `${id}.json`);
  const content = JSON.stringify(entity, null, 2);

  await atomicWriteFile(filePath, content);
  return ok(undefined);
}
```

### 4.6 Storage Adapter Implementation Structure

```typescript
// packages/storage-fs/src/file-system-adapter.ts

import { join } from 'path';
import { mkdir, readdir, readFile, unlink } from 'fs/promises';
import { ok, err, type Result } from 'neverthrow';
import type { StorageAdapter, ProjectFilter, EmployeeFilter, TaskFilter } from '@oct/core';

export class FileSystemStorageAdapter implements StorageAdapter {
  private baseDir: string;
  private locks: Map<string, FileLock>;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.locks = new Map();
  }

  private getDir(type: 'projects' | 'employees' | 'templates' | 'tasks'): string {
    return join(this.baseDir, type);
  }

  private async ensureDir(type: string): Promise<void> {
    await mkdir(this.getDir(type as any), { recursive: true });
  }

  private async withLock<T>(entityType: string, fn: () => Promise<T>): Promise<T> {
    const lockKey = `${this.baseDir}:${entityType}`;
    let lock = this.locks.get(lockKey);
    if (!lock) {
      lock = new FileLock(join(this.baseDir, `.${entityType}.lock`));
      this.locks.set(lockKey, lock);
    }

    await lock.acquire();
    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }

  // Implementation of all StorageAdapter methods...
  // Each method uses withLock() for concurrency control
  // and atomicWriteFile() for safe writes
}
```

---

## 5. Use Case Signatures

### 5.1 Project Use Cases

```typescript
// packages/core/src/use-cases/project/create-project.ts

export const createProjectInputSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  parentId: z.string().optional(),
  employeeIds: z.array(z.string()).default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const createProjectOutputSchema = z.object({
  project: projectSchema,
});

export type CreateProjectOutput = z.infer<typeof createProjectOutputSchema>;

export async function createProjectUseCase(
  ctx: ExecutionContext,
  input: CreateProjectInput,
  adapter: StorageAdapter
): Promise<Result<CreateProjectOutput, DomainError>>;

// Errors: UNAUTHORIZED, FORBIDDEN, INVALID_INPUT, CONFLICT (circular parent), NOT_FOUND (parent)
```

```typescript
// packages/core/src/use-cases/project/update-project.ts

export const updateProjectInputSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'paused']).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

export async function updateProjectUseCase(
  ctx: ExecutionContext,
  input: UpdateProjectInput,
  adapter: StorageAdapter
): Promise<Result<{ project: Project }, DomainError>>;

// Errors: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT (if has incomplete tasks when archiving)
```

```typescript
// packages/core/src/use-cases/project/archive-project.ts

export async function archiveProjectUseCase(
  ctx: ExecutionContext,
  input: { projectId: string },
  adapter: StorageAdapter
): Promise<Result<{ project: Project }, DomainError>>;

// Recursively archives all sub-projects
```

```typescript
// packages/core/src/use-cases/project/delete-project.ts

export async function deleteProjectUseCase(
  ctx: ExecutionContext,
  input: { projectId: string },
  adapter: StorageAdapter
): Promise<Result<void, DomainError>>;

// Errors: CONFLICT if project has non-archived tasks or sub-projects
```

```typescript
// packages/core/src/use-cases/project/list-projects.ts

export const listProjectsInputSchema = z.object({
  filter: z.object({
    status: z.enum(['active', 'archived', 'paused']).optional(),
    parentId: z.string().optional(),
  }).optional(),
});

export type ListProjectsInput = z.infer<typeof listProjectsInputSchema>;

export async function listProjectsUseCase(
  ctx: ExecutionContext,
  input: ListProjectsInput,
  adapter: StorageAdapter
): Promise<Result<{ projects: Project[] }, DomainError>>;
```

```typescript
// packages/core/src/use-cases/project/add-employee-to-project.ts

export async function addEmployeeToProjectUseCase(
  ctx: ExecutionContext,
  input: { projectId: string; employeeId: string },
  adapter: StorageAdapter
): Promise<Result<{ project: Project }, DomainError>>;

// Errors: NOT_FOUND (project or employee), CONFLICT (already member)
```

```typescript
// packages/core/src/use-cases/project/remove-employee-from-project.ts

export async function removeEmployeeFromProjectUseCase(
  ctx: ExecutionContext,
  input: { projectId: string; employeeId: string },
  adapter: StorageAdapter
): Promise<Result<{ project: Project }, DomainError>>;

// Errors: CONFLICT if employee has assigned tasks in project
```

### 5.2 Employee Use Cases

```typescript
// packages/core/src/use-cases/employee/create-employee.ts

export const capabilitiesSchema = z.object({
  canExecuteTasks: z.boolean(),
  canCreateTasks: z.boolean(),
  canAutoApprove: z.boolean(),
});

export const createEmployeeInputSchema = z.object({
  name: z.string().min(1).max(256),
  kind: z.enum(['human', 'ai']),
  templateId: z.string().optional(),
  capabilities: capabilitiesSchema,
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

export async function createEmployeeUseCase(
  ctx: ExecutionContext,
  input: CreateEmployeeInput,
  adapter: StorageAdapter
): Promise<Result<{ employee: Employee }, DomainError>>;

// If templateId provided, merges template defaults with provided capabilities
```

```typescript
// packages/core/src/use-cases/employee/update-employee.ts

export const updateEmployeeInputSchema = z.object({
  employeeId: z.string(),
  name: z.string().min(1).max(256).optional(),
  capabilities: capabilitiesSchema.partial().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;

export async function updateEmployeeUseCase(
  ctx: ExecutionContext,
  input: UpdateEmployeeInput,
  adapter: StorageAdapter
): Promise<Result<{ employee: Employee }, DomainError>>;
```

```typescript
// packages/core/src/use-cases/employee/refresh-from-template.ts

export async function refreshFromTemplateUseCase(
  ctx: ExecutionContext,
  input: { employeeId: string },
  adapter: StorageAdapter
): Promise<Result<{ employee: Employee }, DomainError>>;

// Re-applies template defaults, preserving employee-specific overrides
```

```typescript
// packages/core/src/use-cases/employee/delete-employee.ts

export async function deleteEmployeeUseCase(
  ctx: ExecutionContext,
  input: { employeeId: string },
  adapter: StorageAdapter
): Promise<Result<void, DomainError>>;

// Errors: CONFLICT if employee owns any non-completed tasks
```

```typescript
// packages/core/src/use-cases/employee/list-employees.ts

export const listEmployeesInputSchema = z.object({
  filter: z.object({
    kind: z.enum(['human', 'ai']).optional(),
    templateId: z.string().optional(),
  }).optional(),
});

export async function listEmployeesUseCase(
  ctx: ExecutionContext,
  input: ListEmployeesInput,
  adapter: StorageAdapter
): Promise<Result<{ employees: Employee[] }, DomainError>>;
```

### 5.3 Template Use Cases

```typescript
// packages/core/src/use-cases/template/create-template.ts

export const createTemplateInputSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  kind: z.enum(['human', 'ai']),
  defaultCapabilities: capabilitiesSchema,
  skills: z.array(z.string()).default([]),
});

export type CreateTemplateInput = z.infer<typeof createTemplateInputSchema>;

export async function createTemplateUseCase(
  ctx: ExecutionContext,
  input: CreateTemplateInput,
  adapter: StorageAdapter
): Promise<Result<{ template: EmployeeTemplate }, DomainError>>;
```

```typescript
// packages/core/src/use-cases/template/update-template.ts

export const updateTemplateInputSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  defaultCapabilities: capabilitiesSchema.partial().optional(),
  skills: z.array(z.string()).optional(),
});

export async function updateTemplateUseCase(
  ctx: ExecutionContext,
  input: UpdateTemplateInput,
  adapter: StorageAdapter
): Promise<Result<{ template: EmployeeTemplate }, DomainError>>;

// Increments version number on successful update
```

```typescript
// packages/core/src/use-cases/template/delete-template.ts

export async function deleteTemplateUseCase(
  ctx: ExecutionContext,
  input: { templateId: string },
  adapter: StorageAdapter
): Promise<Result<void, DomainError>>;

// Errors: CONFLICT if any employees reference this template
```

```typescript
// packages/core/src/use-cases/template/list-templates.ts

export async function listTemplatesUseCase(
  ctx: ExecutionContext,
  input: {},
  adapter: StorageAdapter
): Promise<Result<{ templates: EmployeeTemplate[] }, DomainError>>;
```

### 5.4 Task Use Cases

```typescript
// packages/core/src/use-cases/task/create-task.ts

export const createTaskInputSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(256),
  type: z.string().min(1),
  ownerId: z.string(),
  context: z.string().optional(),
  goal: z.string().optional(),
  deliverable: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  dependencies: z.array(z.string()).default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export async function createTaskUseCase(
  ctx: ExecutionContext,
  input: CreateTaskInput,
  adapter: StorageAdapter
): Promise<Result<{ task: Task }, DomainError>>;

// Errors: NOT_FOUND (project, owner, dependencies), CONFLICT (circular dependency),
//         FORBIDDEN (owner not in project)
```

```typescript
// packages/core/src/use-cases/task/update-task.ts

export const updateTaskInputSchema = z.object({
  taskId: z.string(),
  title: z.string().min(1).max(256).optional(),
  type: z.string().optional(),
  ownerId: z.string().optional(),
  context: z.string().optional(),
  goal: z.string().optional(),
  deliverable: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  dependencies: z.array(z.string()).optional(),
});

export async function updateTaskUseCase(
  ctx: ExecutionContext,
  input: UpdateTaskInput,
  adapter: StorageAdapter
): Promise<Result<{ task: Task }, DomainError>>;

// Validates dependencies don't create cycle
// Recomputes blockedBy based on new dependencies
```

```typescript
// packages/core/src/use-cases/task/move-task.ts

export async function moveTaskUseCase(
  ctx: ExecutionContext,
  input: { taskId: string; newProjectId: string },
  adapter: StorageAdapter
): Promise<Result<{ task: Task }, DomainError>>;

// Errors: FORBIDDEN if new owner not in new project
```

```typescript
// packages/core/src/use-cases/task/delete-task.ts

export async function deleteTaskUseCase(
  ctx: ExecutionContext,
  input: { taskId: string },
  adapter: StorageAdapter
): Promise<Result<void, DomainError>>;

// Errors: CONFLICT if other tasks depend on this task
```

```typescript
// packages/core/src/use-cases/task/start-task.ts

export async function startTaskUseCase(
  ctx: ExecutionContext,
  input: { taskId: string },
  adapter: StorageAdapter
): Promise<Result<{ task: Task }, DomainError>>;

// Errors: CONFLICT if dependencies not done, FORBIDDEN if not task owner
```

```typescript
// packages/core/src/use-cases/task/complete-task.ts

export async function completeTaskUseCase(
  ctx: ExecutionContext,
  input: { taskId: string },
  adapter: StorageAdapter
): Promise<Result<{ task: Task }, DomainError>>;

// Transitions to 'in_review' if approval required, 'done' if auto-approved
// Triggers dependency unblocking for dependent tasks
```

```typescript
// packages/core/src/use-cases/task/block-task.ts

export async function blockTaskUseCase(
  ctx: ExecutionContext,
  input: { taskId: string; reason?: string },
  adapter: StorageAdapter
): Promise<Result<{ task: Task }, DomainError>>;

// Sets status to 'blocked', stores reason in metadata
```

```typescript
// packages/core/src/use-cases/task/approve-task.ts

export const approveTaskInputSchema = z.object({
  taskId: z.string(),
  approverId: z.string(),
});

export async function approveTaskUseCase(
  ctx: ExecutionContext,
  input: ApproveTaskInput,
  adapter: StorageAdapter
): Promise<Result<{ task: Task }, DomainError>>;

// Transitions task to 'done', updates approval object
```

```typescript
// packages/core/src/use-cases/task/reject-task.ts

export const rejectTaskInputSchema = z.object({
  taskId: z.string(),
  approverId: z.string(),
  reason: z.string(),
});

export async function rejectTaskUseCase(
  ctx: ExecutionContext,
  input: RejectTaskInput,
  adapter: StorageAdapter
): Promise<Result<{ task: Task }, DomainError>>;

// Transitions task back to 'todo', stores rejection reason
```

```typescript
// packages/core/src/use-cases/task/list-tasks.ts

export const listTasksInputSchema = z.object({
  filter: z.object({
    projectId: z.string().optional(),
    ownerId: z.string().optional(),
    status: z.enum(['backlog', 'todo', 'in_progress', 'blocked', 'in_review', 'done']).optional(),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  }).optional(),
});

export async function listTasksUseCase(
  ctx: ExecutionContext,
  input: ListTasksInput,
  adapter: StorageAdapter
): Promise<Result<{ tasks: Task[] }, DomainError>>;
```

### 5.5 Summary/Report Use Cases

```typescript
// packages/core/src/use-cases/summary/get-project-summary.ts

export interface ProjectSummary {
  projectId: string;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<string, number>;
  completionPercentage: number;
  blockedTasks: number;
  overdueTasks: number; // if we add due dates later
}

export async function getProjectSummaryUseCase(
  ctx: ExecutionContext,
  input: { projectId: string },
  adapter: StorageAdapter
): Promise<Result<{ summary: ProjectSummary }, DomainError>>;
```

```typescript
// packages/core/src/use-cases/summary/get-employee-workload.ts

export interface EmployeeWorkload {
  employeeId: string;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  highPriorityTasks: number; // P0 + P1
}

export async function getEmployeeWorkloadUseCase(
  ctx: ExecutionContext,
  input: { employeeId: string },
  adapter: StorageAdapter
): Promise<Result<{ workload: EmployeeWorkload }, DomainError>>;
```

```typescript
// packages/core/src/use-cases/summary/get-pending-approvals.ts

export async function getPendingApprovalsUseCase(
  ctx: ExecutionContext,
  input: { approverId?: string },
  adapter: StorageAdapter
): Promise<Result<{ tasks: Task[] }, DomainError>>;

// If approverId provided, filters by tasks they can approve
```

```typescript
// packages/core/src/use-cases/summary/get-blocked-tasks.ts

export interface BlockedTaskInfo {
  task: Task;
  blockers: Task[]; // Tasks that are blocking this one
}

export async function getBlockedTasksUseCase(
  ctx: ExecutionContext,
  input: { projectId?: string },
  adapter: StorageAdapter
): Promise<Result<{ tasks: BlockedTaskInfo[] }, DomainError>>;
```

---

## 6. MCP Tool Design

### 6.1 Tool Registry

```typescript
// packages/mcp/src/tools/index.ts

export const mcpTools = [
  // Project tools
  projectCreateTool,
  projectListTool,
  projectGetTool,
  projectArchiveTool,

  // Employee tools
  employeeCreateTool,
  employeeListTool,
  employeeGetTool,

  // Template tools
  templateListTool,
  templateGetTool,

  // Task tools
  taskCreateTool,
  taskListTool,
  taskGetTool,
  taskStartTool,
  taskCompleteTool,
  taskApproveTool,

  // Summary tools
  summaryProjectTool,
  summaryWorkloadTool,
  summaryBlockedTool,
];
```

### 6.2 Project Tools

```typescript
// packages/mcp/src/tools/project-create.ts

export const projectCreateTool = {
  name: 'project_create',
  description: 'Create a new project or sub-project',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Project name (1-256 characters)',
      },
      description: {
        type: 'string',
        description: 'Optional project description (markdown supported)',
      },
      parentId: {
        type: 'string',
        description: 'Optional parent project ID for creating sub-projects',
      },
      employeeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Employee IDs who can work on this project',
        default: [],
      },
    },
    required: ['name'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      name: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'string' },
    },
  },
};
```

```typescript
// packages/mcp/src/tools/project-list.ts

export const projectListTool = {
  name: 'project_list',
  description: 'List projects with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'archived', 'paused'],
        description: 'Filter by project status',
      },
      parentId: {
        type: 'string',
        description: 'Filter by parent project (null for root projects)',
      },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      projects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            parentId: { type: 'string' },
            employeeIds: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  },
};
```

```typescript
// packages/mcp/src/tools/project-get.ts

export const projectGetTool = {
  name: 'project_get',
  description: 'Get a project by ID including its tasks',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The project ID',
      },
      includeTasks: {
        type: 'boolean',
        description: 'Whether to include tasks in the response',
        default: false,
      },
    },
    required: ['projectId'],
  },
};
```

```typescript
// packages/mcp/src/tools/project-archive.ts

export const projectArchiveTool = {
  name: 'project_archive',
  description: 'Archive a project and all its sub-projects',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The project ID to archive',
      },
    },
    required: ['projectId'],
  },
};
```

### 6.3 Employee Tools

```typescript
// packages/mcp/src/tools/employee-create.ts

export const employeeCreateTool = {
  name: 'employee_create',
  description: 'Create a new employee (human or AI agent)',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Display name for the employee',
      },
      kind: {
        type: 'string',
        enum: ['human', 'ai'],
        description: 'Type of employee',
      },
      templateId: {
        type: 'string',
        description: 'Optional template ID for role defaults',
      },
      capabilities: {
        type: 'object',
        properties: {
          canExecuteTasks: { type: 'boolean' },
          canCreateTasks: { type: 'boolean' },
          canAutoApprove: { type: 'boolean' },
        },
        description: 'Employee capabilities',
      },
    },
    required: ['name', 'kind', 'capabilities'],
  },
};
```

```typescript
// packages/mcp/src/tools/employee-list.ts

export const employeeListTool = {
  name: 'employee_list',
  description: 'List all employees with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        enum: ['human', 'ai'],
        description: 'Filter by employee type',
      },
    },
  },
};
```

```typescript
// packages/mcp/src/tools/employee-get.ts

export const employeeGetTool = {
  name: 'employee_get',
  description: 'Get an employee by ID',
  inputSchema: {
    type: 'object',
    properties: {
      employeeId: {
        type: 'string',
        description: 'The employee ID',
      },
      includeTasks: {
        type: 'boolean',
        description: 'Whether to include assigned tasks',
        default: false,
      },
    },
    required: ['employeeId'],
  },
};
```

### 6.4 Template Tools

```typescript
// packages/mcp/src/tools/template-list.ts

export const templateListTool = {
  name: 'template_list',
  description: 'List all employee templates',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};
```

```typescript
// packages/mcp/src/tools/template-get.ts

export const templateGetTool = {
  name: 'template_get',
  description: 'Get a template by ID',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: {
        type: 'string',
        description: 'The template ID',
      },
    },
    required: ['templateId'],
  },
};
```

### 6.5 Task Tools

```typescript
// packages/mcp/src/tools/task-create.ts

export const taskCreateTool = {
  name: 'task_create',
  description: 'Create a new task in a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID to create the task in',
      },
      title: {
        type: 'string',
        description: 'Task title (1-256 characters)',
      },
      type: {
        type: 'string',
        description: 'Task type (e.g., feature, bug, docs)',
      },
      ownerId: {
        type: 'string',
        description: 'Employee ID who owns this task',
      },
      context: {
        type: 'string',
        description: 'Background information',
      },
      goal: {
        type: 'string',
        description: 'What needs to be achieved',
      },
      deliverable: {
        type: 'string',
        description: 'Expected output',
      },
      priority: {
        type: 'string',
        enum: ['P0', 'P1', 'P2', 'P3'],
        description: 'Task priority',
        default: 'P2',
      },
      dependencies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Task IDs that must be completed first',
        default: [],
      },
    },
    required: ['projectId', 'title', 'type', 'ownerId'],
  },
};
```

```typescript
// packages/mcp/src/tools/task-list.ts

export const taskListTool = {
  name: 'task_list',
  description: 'List tasks with filtering options',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Filter by project',
      },
      ownerId: {
        type: 'string',
        description: 'Filter by task owner',
      },
      status: {
        type: 'string',
        enum: ['backlog', 'todo', 'in_progress', 'blocked', 'in_review', 'done'],
        description: 'Filter by status',
      },
      priority: {
        type: 'string',
        enum: ['P0', 'P1', 'P2', 'P3'],
        description: 'Filter by priority',
      },
    },
  },
};
```

```typescript
// packages/mcp/src/tools/task-get.ts

export const taskGetTool = {
  name: 'task_get',
  description: 'Get a task by ID',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID',
      },
      includeDependencies: {
        type: 'boolean',
        description: 'Include full dependency task objects',
        default: false,
      },
    },
    required: ['taskId'],
  },
};
```

```typescript
// packages/mcp/src/tools/task-start.ts

export const taskStartTool = {
  name: 'task_start',
  description: 'Start working on a task (transitions to in_progress)',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID to start',
      },
    },
    required: ['taskId'],
  },
};
```

```typescript
// packages/mcp/src/tools/task-complete.ts

export const taskCompleteTool = {
  name: 'task_complete',
  description: 'Mark a task as complete (transitions to in_review or done)',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID to complete',
      },
      notes: {
        type: 'string',
        description: 'Optional completion notes',
      },
    },
    required: ['taskId'],
  },
};
```

```typescript
// packages/mcp/src/tools/task-approve.ts

export const taskApproveTool = {
  name: 'task_approve',
  description: 'Approve a completed task',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID to approve',
      },
    },
    required: ['taskId'],
  },
};
```

### 6.6 Summary Tools

```typescript
// packages/mcp/src/tools/summary-project.ts

export const summaryProjectTool = {
  name: 'summary_project',
  description: 'Get summary statistics for a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The project ID',
      },
    },
    required: ['projectId'],
  },
};
```

```typescript
// packages/mcp/src/tools/summary-workload.ts

export const summaryWorkloadTool = {
  name: 'summary_workload',
  description: 'Get workload statistics for an employee',
  inputSchema: {
    type: 'object',
    properties: {
      employeeId: {
        type: 'string',
        description: 'The employee ID',
      },
    },
    required: ['employeeId'],
  },
};
```

```typescript
// packages/mcp/src/tools/summary-blocked.ts

export const summaryBlockedTool = {
  name: 'summary_blocked',
  description: 'Get all blocked tasks and their blockers',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Optional project ID to filter by',
      },
    },
  },
};
```

---

## 7. Domain Entity Schemas

### 7.1 Project

```typescript
// packages/core/src/domain/project.ts

export const projectSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  parentId: z.string().optional(),
  employeeIds: z.array(z.string()),
  status: z.enum(['active', 'archived', 'paused']),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Project = z.infer<typeof projectSchema>;
```

### 7.2 Employee

```typescript
// packages/core/src/domain/employee.ts

export const capabilitiesSchema = z.object({
  canExecuteTasks: z.boolean(),
  canCreateTasks: z.boolean(),
  canAutoApprove: z.boolean(),
});

export const employeeSchema = z.object({
  employeeId: z.string(),
  name: z.string().min(1).max(256),
  kind: z.enum(['human', 'ai']),
  templateId: z.string().optional(),
  capabilities: capabilitiesSchema,
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Employee = z.infer<typeof employeeSchema>;
```

### 7.3 EmployeeTemplate

```typescript
// packages/core/src/domain/template.ts

export const employeeTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  kind: z.enum(['human', 'ai']),
  defaultCapabilities: capabilitiesSchema,
  skills: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type EmployeeTemplate = z.infer<typeof employeeTemplateSchema>;
```

### 7.4 Task

```typescript
// packages/core/src/domain/task.ts

export const taskStatusSchema = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'blocked',
  'in_review',
  'done',
]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const approvalSchema = z.object({
  state: z.enum(['pending', 'approved', 'rejected', 'auto_approved']),
  approverId: z.string().nullable(),
  approvedAt: z.string().datetime().nullable(),
  policy: z.string(),
});

export const taskSchema = z.object({
  taskId: z.string(),
  projectId: z.string(),
  title: z.string().min(1).max(256),
  type: z.string(),
  ownerId: z.string(),
  context: z.string().optional(),
  goal: z.string().optional(),
  deliverable: z.string().optional(),
  status: taskStatusSchema,
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  dependencies: z.array(z.string()),
  blockedBy: z.array(z.string()),
  approval: approvalSchema.nullable(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Task = z.infer<typeof taskSchema>;
```

---

## 8. Package Structure

```
packages/
├── core/
│   ├── src/
│   │   ├── domain/
│   │   │   ├── project.ts
│   │   │   ├── employee.ts
│   │   │   ├── template.ts
│   │   │   └── task.ts
│   │   ├── ports/
│   │   │   └── storage-adapter.ts
│   │   ├── use-cases/
│   │   │   ├── project/
│   │   │   ├── employee/
│   │   │   ├── template/
│   │   │   ├── task/
│   │   │   └── summary/
│   │   └── schemas/
│   │       ├── context.ts
│   │       ├── error.ts
│   │       └── index.ts
│   └── package.json
├── storage-fs/
│   ├── src/
│   │   ├── file-system-adapter.ts
│   │   ├── lock.ts
│   │   ├── atomic-write.ts
│   │   └── index.ts
│   └── package.json
├── cli/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── project.ts
│   │   │   ├── employee.ts
│   │   │   ├── template.ts
│   │   │   ├── task.ts
│   │   │   └── summary.ts
│   │   ├── index.ts
│   │   └── config.ts
│   └── package.json
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── projects.ts
│   │   │   ├── employees.ts
│   │   │   ├── templates.ts
│   │   │   ├── tasks.ts
│   │   │   └── summary.ts
│   │   ├── index.ts
│   │   └── error-handler.ts
│   └── package.json
└── mcp/
    ├── src/
    │   ├── tools/
    │   │   ├── project-create.ts
    │   │   ├── project-list.ts
    │   │   ├── project-get.ts
    │   │   ├── project-archive.ts
    │   │   ├── employee-create.ts
    │   │   ├── employee-list.ts
    │   │   ├── employee-get.ts
    │   │   ├── template-list.ts
    │   │   ├── template-get.ts
    │   │   ├── task-create.ts
    │   │   ├── task-list.ts
    │   │   ├── task-get.ts
    │   │   ├── task-start.ts
    │   │   ├── task-complete.ts
    │   │   ├── task-approve.ts
    │   │   ├── summary-project.ts
    │   │   ├── summary-workload.ts
    │   │   └── summary-blocked.ts
    │   ├── index.ts
    │   └── tool-registry.ts
    └── package.json
```

---

## 9. Consistency with v1 Patterns

The v2 architecture maintains consistency with v1 where applicable:

| Aspect | v1 Pattern | v2 Pattern |
|--------|-----------|------------|
| Error handling | `DomainError` with codes | Same - extended with `CONFLICT` |
| Result types | `neverthrow` Result | Same |
| Validation | Zod schemas | Same - extended for new entities |
| Use case structure | Context + Input + Repository | Context + Input + StorageAdapter |
| Repository pattern | `TaskRepository` interface | `StorageAdapter` interface (expanded) |
| Execution context | `actorId`, `workspaceId`, `permissions` | Same - adds `environment` |

---

## 10. Key Design Decisions

1. **Unified StorageAdapter**: Combined all entity operations into a single interface for atomic transactions across entities.

2. **Computed blockedBy**: The `blockedBy` field on tasks is computed from `dependencies` and current dependency statuses, not stored directly.

3. **Template Versioning**: Templates have a version number that increments on update, enabling cache invalidation.

4. **Simple File Locking**: Uses PID-based lock files suitable for single-user CLI; not suitable for multi-process concurrent access.

5. **Atomic Writes**: All file writes use temp-file + rename pattern for crash safety.

6. **No Soft Deletes**: All deletes are hard deletes; referential integrity enforced at application layer.

7. **Approval Policy Strings**: Approval policies are stored as strings (e.g., "any-senior") for flexibility; enforcement in use cases.

---

Status: READY FOR IMPLEMENTATION
