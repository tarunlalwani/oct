# OCT v3 Architecture Design Document

## Overview

OCT (OpenClaw Task Manager) v3 is a task management system designed for AI agents and human collaboration. This version introduces a simplified domain model with Workers, Projects, and Tasks, while maintaining clean architecture principles.

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERFACE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │     CLI      │  │  REST API    │  │ MCP Server   │                      │
│  │  @oct/cli    │  │  @oct/server │  │  @oct/mcp    │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
└─────────┼─────────────────┼─────────────────┼──────────────────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────────┐
│                           │              CORE LAYER                          │
├───────────────────────────┼─────────────────────────────────────────────────┤
│                           │                                                 │
│  ┌────────────────────────┴────────────────────────┐                        │
│  │              @oct/core                          │                        │
│  │  ┌──────────────┐  ┌──────────────────────┐    │                        │
│  │  │   Domain     │  │     Use Cases        │    │                        │
│  │  │  - Worker    │  │  - Create Task       │    │                        │
│  │  │  - Project   │  │  - Start Task        │    │                        │
│  │  │  - Task      │  │  - Complete Task     │    │                        │
│  │  └──────────────┘  └──────────────────────┘    │                        │
│  │  ┌──────────────┐  ┌──────────────────────┐    │                        │
│  │  │   Ports      │  │     Schemas          │    │                        │
│  │  │  - Storage   │  │  - Validation        │    │                        │
│  │  │    Adapter   │  │  - Types             │    │                        │
│  │  └──────────────┘  └──────────────────────┘    │                        │
│  └─────────────────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ implements
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────┐                            │
│  │   @oct/storage-fs  │  │ @oct/storage-memory│                            │
│  │  File system       │  │  In-memory         │                            │
│  │  storage           │  │  storage (tests)   │                            │
│  └────────────────────┘  └────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Package Structure

```
packages/
├── core/                    # Business logic (zero dependencies)
│   ├── src/
│   │   ├── domain/         # Entity definitions
│   │   │   ├── worker.ts
│   │   │   ├── project.ts
│   │   │   └── task.ts
│   │   ├── ports/          # Interfaces for infrastructure
│   │   │   └── storage-adapter.ts
│   │   ├── use-cases/      # Business workflows
│   │   │   ├── worker/
│   │   │   ├── project/
│   │   │   └── task/
│   │   └── schemas/        # Validation schemas
│   │       ├── context.ts
│   │       ├── error.ts
│   │       ├── worker.ts
│   │       ├── project.ts
│   │       └── task.ts
│   └── package.json
├── cli/                    # Command-line interface
│   ├── src/
│   │   ├── commands/
│   │   ├── context/
│   │   └── index.ts
│   └── package.json
├── server/                 # REST API server
│   ├── src/
│   │   ├── routes/
│   │   ├── context/
│   │   ├── serializers/
│   │   └── index.ts
│   └── package.json
├── mcp/                    # MCP server for AI assistants
│   ├── src/
│   │   ├── tools/
│   │   └── index.ts
│   └── package.json
├── storage-fs/             # File system storage
│   └── src/
│       └── file-system-adapter.ts
└── storage-memory/         # In-memory storage (testing)
    └── src/
        └── memory-adapter.ts
```

---

## 2. Domain Model

### 2.1 Entity Overview

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| **Worker** | Human or AI agent that can own tasks | Owns tasks, belongs to projects |
| **Project** | Container for related tasks | Contains tasks, has members |
| **Task** | Unit of work with status and dependencies | Belongs to project, owned by worker |

### 2.2 Entity Schemas

#### Worker

```typescript
interface Worker {
  workerId: string;           // UUIDv7
  name: string;               // Display name (1-256 chars)
  type: 'human' | 'agent';    // Worker type
  roles: string[];            // Role identifiers
  permissions: string[];      // Granted permissions
  createdAt: string;          // ISO datetime
  updatedAt: string;          // ISO datetime
}
```

#### Project

```typescript
interface Project {
  projectId: string;          // UUIDv7
  name: string;               // Project name (1-256 chars)
  description: string;        // Description (max 10000 chars)
  parentId: string | null;    // Parent project (for nesting)
  memberIds: string[];        // Worker IDs who can access
  status: 'active' | 'archived';
  createdAt: string;          // ISO datetime
  updatedAt: string;          // ISO datetime
}
```

#### Task

```typescript
interface Task {
  taskId: string;             // UUIDv7
  projectId: string;          // Parent project
  title: string;              // Task title (1-256 chars)
  description: string;        // Details (max 10000 chars)
  ownerId: string;            // Assigned worker
  status: TaskStatus;         // See below
  priority: number;           // 1-4 (1=highest)
  dependencies: string[];     // Task IDs that must complete first
  createdAt: string;          // ISO datetime
  updatedAt: string;          // ISO datetime
}

type TaskStatus =
  | 'backlog'     // Not ready to start
  | 'ready'       // Dependencies satisfied
  | 'active'      // In progress
  | 'blocked'     // Waiting on dependencies
  | 'review'      // Pending review
  | 'done';       // Completed
```

### 2.3 Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIPS                               │
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
│ - dependencies│    │    │ - dependencies│    │
└──────────────┘    │    └──────────────┘    │
       ▲            │           ▲            │
       │            │           │            │
       │ *          │           │ *          │
       │            │           │            │
┌──────┴───────┐    │    ┌──────┴───────┐    │
│    Worker    │◄───┘    │    Worker    │◄───┘
│              │ 1       │              │ 1
│ - workerId   │         │ - workerId   │
│ - type       │         │ - type       │
│ - permissions│         │ - permissions│
└──────────────┘         └──────────────┘
```

### 2.4 Relationship Rules

| Relationship | Type | Cardinality | Rules |
|--------------|------|-------------|-------|
| Project → Task | Composition | 1:* | Tasks must belong to a project |
| Project → Project | Self-reference | 1:* | Projects can have sub-projects |
| Worker → Task | Ownership | 1:* | Each task has one owner |
| Project → Worker | Membership | *:* | Workers are members of projects |
| Task → Task | Dependency | *:* | Tasks can depend on other tasks (DAG) |

---

## 3. Task Lifecycle

### 3.1 Status Transitions

```
                    ┌─────────────────────────────────────┐
                    │           STATUS FLOW               │
                    └─────────────────────────────────────┘

    ┌─────────┐     ┌─────────┐     ┌─────────────┐
    │ backlog │────►│  ready  │────►│   active    │
    └─────────┘     └────┬────┘     └──────┬──────┘
                         │                 │
                         │ (dependencies   │ (work
                         │  not done)      │  complete)
                         ▼                 ▼
                    ┌─────────┐       ┌──────────┐
                    │ blocked │◄────  │  review  │
                    └────┬────┘       └────┬─────┘
                         │                 │
                         │ (dependency     │ (approved)
                         │  completed)     │
                         └────────────────►│
                                           ▼
                                     ┌─────────┐
                                     │   done  │
                                     └─────────┘
```

### 3.2 Status Rules

| Transition | Condition | Auto-trigger |
|------------|-----------|--------------|
| `backlog` → `ready` | All dependencies done | Yes |
| `ready` → `active` | Worker starts task | Manual (task_start) |
| `active` → `review` | Work complete | Manual (task_complete) |
| `review` → `done` | Approved | Manual (task_approve) |
| Any → `blocked` | Dependency not done | Auto when deps added |
| `blocked` → `ready` | All dependencies done | Yes |
| `done` → `backlog` | Reopen task | Manual (task_reopen) |

### 3.3 Dependency Management

```typescript
// When a task is created with dependencies:
// 1. Check all dependencies exist
// 2. Check no circular dependency
// 3. Set status to 'blocked' if any dependency not done
// 4. Set status to 'ready' if all dependencies done

// When a dependency is marked done:
// 1. Find all tasks depending on it
// 2. For each dependent task:
//    - Check if all its dependencies are done
//    - If yes and status is 'blocked', transition to 'ready'
```

---

## 4. Storage Adapter Interface

### 4.1 Interface Definition

```typescript
interface StorageAdapter {
  // Workers
  getWorker(id: string): Promise<Result<Worker | null, DomainError>>;
  saveWorker(worker: Worker): Promise<Result<void, DomainError>>;
  deleteWorker(id: string): Promise<Result<void, DomainError>>;
  listWorkers(): Promise<Result<Worker[], DomainError>>;

  // Projects
  getProject(id: string): Promise<Result<Project | null, DomainError>>;
  saveProject(project: Project): Promise<Result<void, DomainError>>;
  deleteProject(id: string): Promise<Result<void, DomainError>>;
  listProjects(filter?: ProjectFilter): Promise<Result<Project[], DomainError>>;

  // Tasks
  getTask(id: string): Promise<Result<Task | null, DomainError>>;
  saveTask(task: Task): Promise<Result<void, DomainError>>;
  deleteTask(id: string): Promise<Result<void, DomainError>>;
  listTasks(filter?: TaskFilter): Promise<Result<Task[], DomainError>>;
  getTasksByDependency(taskId: string): Promise<Result<Task[], DomainError>>;

  // Transactions
  transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<Result<T, DomainError>>;
}
```

### 4.2 Filter Types

```typescript
interface ProjectFilter {
  status?: 'active' | 'archived';
  parentId?: string | null;
}

interface TaskFilter {
  projectId?: string;
  ownerId?: string;
  status?: TaskStatus;
  priority?: number;
}
```

---

## 5. REST API Design

### 5.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REST API SERVER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │    Routes    │───►│   Use Cases  │───►│   Storage    │                  │
│  │              │    │              │    │   Adapter    │                  │
│  │  /v1/workers │    │  @oct/core   │    │              │                  │
│  │  /v1/projects│    │              │    │  @oct/storage│                  │
│  │  /v1/tasks   │    │              │    │              │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                    │                         │
│         ▼                   ▼                    ▼                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Context    │    │   Result     │    │   File       │                  │
│  │   Builder    │    │   Handler    │    │   System     │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Authentication

Header-based authentication:

```
X-Actor-ID: <worker-id>           # Acting user/agent
X-Workspace-ID: <workspace>       # Workspace identifier
X-Permissions: <perms>            # Comma-separated permissions
```

### 5.3 Response Format

Success:
```json
{
  "ok": true,
  "data": { ... }
}
```

Error:
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Task not found",
    "details": {},
    "retryable": false
  }
}
```

### 5.4 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_INPUT` | 400 | Invalid parameters |
| `CONFLICT` | 409 | Resource conflict |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 6. MCP Server Design

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MCP SERVER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         MCP Protocol                                │   │
│  │                    (stdio transport)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Tool Registry                                  │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │worker_create│ │project_create│ │ task_create │ │summary_stats│   │   │
│  │  │worker_list  │ │project_list  │ │ task_list   │ │             │   │   │
│  │  │worker_get   │ │project_get   │ │ task_get    │ │             │   │   │
│  │  │worker_update│ │project_update│ │ task_start  │ │             │   │   │
│  │  │worker_delete│ │project_archive││task_complete│ │             │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         @oct/core                                   │   │
│  │                     (Use Cases)                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Worker** | `worker_create`, `worker_list`, `worker_get`, `worker_update`, `worker_delete` | Manage workers |
| **Project** | `project_create`, `project_list`, `project_get`, `project_update`, `project_archive`, `project_delete`, `project_add_member`, `project_remove_member` | Manage projects |
| **Task** | `task_create`, `task_list`, `task_get`, `task_update`, `task_move`, `task_delete`, `task_start`, `task_complete`, `task_reopen`, `task_assign` | Manage tasks |
| **Summary** | `summary_ready_tasks`, `summary_blocked_tasks`, `summary_project_stats`, `summary_worker_workload` | Get insights |

### 6.3 Tool Schema

Each tool follows MCP specification:

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
}

// Example: task_create
{
  name: 'task_create',
  description: 'Create a new task in a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
      title: { type: 'string', description: 'Task title' },
      description: { type: 'string', description: 'Task details' },
      ownerId: { type: 'string', description: 'Assigned worker' },
      priority: { type: 'number', description: 'Priority 1-4' },
      dependencies: { type: 'array', items: { type: 'string' } }
    },
    required: ['projectId', 'title', 'ownerId']
  }
}
```

---

## 7. Permission System

### 7.1 Permission Constants

```typescript
const PERMISSIONS = {
  // Worker
  WORKER_CREATE: 'worker:create',
  WORKER_READ: 'worker:read',
  WORKER_UPDATE: 'worker:update',
  WORKER_DELETE: 'worker:delete',

  // Project
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_MANAGE_MEMBERS: 'project:manage-members',

  // Task
  TASK_CREATE: 'task:create',
  TASK_READ: 'task:read',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_START: 'task:start',
  TASK_COMPLETE: 'task:complete',
  TASK_REOPEN: 'task:reopen',
  TASK_ASSIGN: 'task:assign',
} as const;
```

### 7.2 Permission Checks

Permissions are checked in use cases based on `ExecutionContext`:

```typescript
interface ExecutionContext {
  actorId: string | null;
  workspaceId: string;
  permissions: string[];
  environment: 'local' | 'ci' | 'server';
  traceId?: string;
}
```

---

## 8. File System Storage

### 8.1 Directory Structure

```
~/.oct/db/
├── workers/
│   ├── worker-<uuid>.json
│   └── ...
├── projects/
│   ├── proj-<uuid>.json
│   └── ...
└── tasks/
    ├── task-<uuid>.json
    └── ...
```

### 8.2 File Naming

| Entity | Prefix | Example |
|--------|--------|---------|
| Worker | `worker-` | `worker-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.json` |
| Project | `proj-` | `proj-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.json` |
| Task | `task-` | `task-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.json` |

### 8.3 Atomic Writes

All writes use temp-file + rename pattern:

```typescript
async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${process.pid}`;
  await writeFile(tempPath, content, 'utf-8');
  await rename(tempPath, filePath);
}
```

---

## 9. Changes from v2

| Aspect | v2 | v3 |
|--------|-----|-----|
| **Entities** | Project, Employee, Template, Task | Project, Worker, Task (simplified) |
| **Employee/Template** | Separate entities with inheritance | Replaced by Worker with explicit permissions |
| **Task Status** | 6 states (backlog, todo, in_progress, blocked, in_review, done) | 6 states (backlog, ready, active, blocked, review, done) |
| **Priority** | P0-P3 enum | Numeric 1-4 |
| **Approval** | Complex approval policy | Simplified (review status) |
| **Capabilities** | Template-based | Explicit permission arrays |
| **MCP Server** | Planned | Implemented |

---

## 10. Key Design Decisions

1. **Simplified Domain**: Removed Template entity and merged Employee into Worker with explicit permissions

2. **Ready Status**: Added explicit `ready` status to distinguish between backlog and ready-to-start tasks

3. **Numeric Priority**: Changed from P0-P3 to 1-4 for easier sorting and comparison

4. **Permission Arrays**: Workers have explicit permission arrays instead of template-based capabilities

5. **MCP First**: Designed MCP server alongside REST API for AI-native workflows

6. **Atomic Storage**: File system storage uses atomic writes for crash safety

7. **No Soft Deletes**: Projects use archive status; other entities are hard deleted with referential checks

8. **Header Auth**: REST API uses headers instead of JWT for simplicity in local/AI contexts

---

Status: IMPLEMENTED
