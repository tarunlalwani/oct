# PRD-v3: OCT (OpenClaw Task Manager) - Production Ready

## 1. Vision

A task management system designed for AI agents and human collaboration. Built for correctness, security, and performance from day one. No legacy compatibility required.

## 2. Core Principles

1. **Security First** - All inputs validated, all actions authorized
2. **Performance Critical** - Local operations <100ms, cold start <200ms
3. **AI Native** - MCP protocol support as first-class interface
4. **Tested** - >90% coverage, property-based tests for critical paths
5. **Observable** - Structured logging, metrics, tracing built-in

## 3. Domain Model

### 3.1 Simplified Entities

```typescript
// Worker (replaces Employee - simpler, clearer)
interface Worker {
  workerId: string;        // UUIDv7
  name: string;
  type: 'human' | 'agent'; // agent = AI
  roles: string[];         // ['developer', 'reviewer']
  permissions: string[];   // Explicit permission list
  createdAt: string;
  updatedAt: string;
}

// Project
interface Project {
  projectId: string;
  name: string;
  description: string;
  parentId: string | null;
  memberIds: string[];     // Workers assigned to project
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// Task - Core Entity
interface Task {
  taskId: string;
  projectId: string;
  title: string;
  description: string;
  ownerId: string;         // Worker responsible
  status: TaskStatus;
  priority: 1 | 2 | 3 | 4; // 1=highest, explicit numeric
  dependencies: string[];  // taskIds
  createdAt: string;
  updatedAt: string;
}

type TaskStatus =
  | 'backlog'
  | 'ready'      // Can be started (deps satisfied)
  | 'active'     // In progress
  | 'blocked'    // Waiting on deps
  | 'review'     // Pending review
  | 'done';
```

### 3.2 What's Removed (vs v2)

- **Templates** - Added complexity, limited value. Workers created directly.
- **Capabilities** - Replaced with explicit `permissions` array
- **Approval object** - Simplified to status transitions
- **Context/goal/deliverable** - Use `description` field
- **Type field** - Use labels/tags in metadata (future)

### 3.3 What's Added

- **Explicit permission system** - Every action checked
- **Numeric priority** - Sortable, clear (1 > 2 > 3 > 4)
- `ready` status - Explicit "can start" state
- Worker `roles` - For organizing without template complexity

## 4. Security Model

### 4.1 Permission System

Every use case requires explicit permissions:

```typescript
const PERMISSIONS = {
  // Project
  'project:create': 'Create new projects',
  'project:read': 'View projects',
  'project:update': 'Edit projects',
  'project:delete': 'Delete projects',
  'project:manage-members': 'Add/remove project members',

  // Task
  'task:create': 'Create tasks',
  'task:read': 'View tasks',
  'task:update': 'Edit tasks',
  'task:delete': 'Delete tasks',
  'task:start': 'Start working on task',
  'task:complete': 'Mark task complete',
  'task:assign': 'Reassign task to different worker',
} as const;
```

### 4.2 Authorization Rules

1. **Authentication** - `actorId` required for all operations
2. **Permission Check** - Worker must have required permission
3. **Project Membership** - Worker must be project member for task operations
4. **Ownership** - Only task owner can start/complete (unless has `task:manage`)
5. **Hierarchy** - Archived projects are read-only

## 5. Performance Requirements

| Operation | Target | Max |
|-----------|--------|-----|
| CLI cold start | <150ms | 200ms |
| Local file read | <50ms | 100ms |
| Local file write | <100ms | 200ms |
| List 1000 tasks | <200ms | 500ms |
| Dependency check | <50ms | 100ms |

### 5.1 Performance Strategies

- **Lazy loading** - Don't load all data on startup
- **Indexed storage** - Maintain indexes for common queries
- **Batch operations** - Load multiple entities in parallel
- **Caching** - In-memory cache for frequently accessed data

## 6. Architecture

### 6.1 Package Structure

```
packages/
├── core/                 # Pure domain - zero dependencies
│   ├── src/
│   │   ├── domain/       # Entity types, validation
│   │   ├── usecases/     # Business logic
│   │   ├── ports/        # Interface definitions
│   │   └── security/     # Authorization logic
│   └── tests/
│       ├── unit/         # Jest/Vitest
│       └── property/     # Fast-check property tests
│
├── storage/              # Pluggable storage
│   ├── src/
│   │   ├── memory/       # In-memory (testing)
│   │   ├── filesystem/   # JSON files
│   │   └── index.ts      # Factory
│   └── tests/
│
├── cli/                  # Command line
│   ├── src/
│   │   ├── commands/     # One file per command
│   │   ├── context.ts    # CLI context builder
│   │   └── main.ts       # Entry point
│   └── tests/
│       ├── integration/  # CLI integration tests
│       └── e2e/          # End-to-end scenarios
│
├── server/               # REST API
│   ├── src/
│   │   ├── routes/       # Fastify routes
│   │   ├── auth/         # Authentication middleware
│   │   └── main.ts       # Server entry
│   └── tests/
│       └── integration/
│
└── mcp/                  # Model Context Protocol
    ├── src/
    │   ├── tools/        # MCP tool definitions
    │   └── server.ts     # MCP server
    └── tests/
```

### 6.2 Storage Adapter (Performance Focused)

```typescript
interface StorageAdapter {
  // Workers
  getWorker(id: string): Promise<Result<Worker | null, Error>>;
  saveWorker(worker: Worker): Promise<Result<void, Error>>;
  deleteWorker(id: string): Promise<Result<void, Error>>;
  listWorkers(): Promise<Result<Worker[], Error>>;

  // Projects
  getProject(id: string): Promise<Result<Project | null, Error>>;
  saveProject(project: Project): Promise<Result<void, Error>>;
  deleteProject(id: string): Promise<Result<void, Error>>;
  listProjects(filter?: { status?: string }): Promise<Result<Project[], Error>>;

  // Tasks
  getTask(id: string): Promise<Result<Task | null, Error>>;
  saveTask(task: Task): Promise<Result<void, Error>>;
  deleteTask(id: string): Promise<Result<void, Error>>;
  listTasks(filter?: TaskFilter): Promise<Result<Task[], Error>>;

  // Optimized queries
  getTasksByProject(projectId: string): Promise<Result<Task[], Error>>;
  getTasksByOwner(workerId: string): Promise<Result<Task[], Error>>;
  getBlockedTasks(): Promise<Result<Task[], Error>>;

  // Batch operations for performance
  getTasksByIds(ids: string[]): Promise<Result<Map<string, Task>, Error>>;
}

interface TaskFilter {
  projectId?: string;
  ownerId?: string;
  status?: TaskStatus;
  priority?: number;
}
```

### 6.3 File System Storage (with Indexing)

```
~/.oct/db/
├── workers/
│   └── {workerId}.json
├── projects/
│   └── {projectId}.json
├── tasks/
│   └── {taskId}.json
└── .indexes/             # Auto-maintained indexes
    ├── tasks-by-project.json
    ├── tasks-by-owner.json
    └── tasks-by-status.json
```

Indexes updated on write for O(1) lookups.

## 7. Use Cases (Complete List)

### Worker Management
1. `createWorker` - Create human or agent worker
2. `getWorker` - Get worker by ID
3. `listWorkers` - List all workers
4. `updateWorker` - Update worker (name, roles, permissions)
5. `deleteWorker` - Delete worker (if no active tasks)

### Project Management
6. `createProject` - Create project (optionally nested)
7. `getProject` - Get project with member details
8. `listProjects` - List projects with filters
9. `updateProject` - Update name/description
10. `archiveProject` - Archive project and all tasks
11. `deleteProject` - Delete (if archived)
12. `addProjectMember` - Add worker to project
13. `removeProjectMember` - Remove worker from project

### Task Management
14. `createTask` - Create task with deps
15. `getTask` - Get task with dependency details
16. `listTasks` - List with filters
17. `updateTask` - Update title/description/priority
18. `moveTask` - Move to different project
19. `deleteTask` - Delete task
20. `startTask` - Transition to active (checks deps, membership)
21. `completeTask` - Transition to review/done
22. `reopenTask` - Move back from done to ready
23. `assignTask` - Change task owner

### Queries
24. `getReadyTasks` - Tasks that can be started
25. `getBlockedTasks` - Tasks with incomplete deps
26. `getProjectStats` - Task counts by status
27. `getWorkerWorkload` - Task counts by worker

## 8. MCP (Model Context Protocol)

All use cases exposed as MCP tools:

```typescript
const tools = [
  { name: 'worker_create', handler: handleCreateWorker },
  { name: 'worker_list', handler: handleListWorkers },
  { name: 'project_create', handler: handleCreateProject },
  { name: 'project_list', handler: handleListProjects },
  { name: 'task_create', handler: handleCreateTask },
  { name: 'task_list', handler: handleListTasks },
  { name: 'task_start', handler: handleStartTask },
  { name: 'task_complete', handler: handleCompleteTask },
  { name: 'get_ready_tasks', handler: handleGetReadyTasks },
  { name: 'get_blocked_tasks', handler: handleGetBlockedTasks },
];
```

MCP server runs over stdio for AI agent integration.

## 9. CLI

### Commands

```bash
# Workers
oct worker create --name "Alice" --type human --roles "developer"
oct worker list
oct worker get --id <id>

# Projects
oct project create --name "Website" --description "Company website"
oct project create --name "Frontend" --parent <id>
oct project list --status active
oct project archive --id <id>
oct project add-member --id <id> --worker <workerId>

# Tasks
oct task create --project <id> --title "Fix auth" --priority 1 --worker <id>
oct task create --project <id> --title "Deploy" --deps "task1,task2"
oct task list --project <id> --status ready
oct task start --id <id>
oct task complete --id <id>
oct task assign --id <id> --worker <newId>

# Reports
oct ready-tasks --project <id>
oct blocked-tasks
oct workload --worker <id>

# Global flags
--json                    # Machine output
--db-path <path>          # Custom DB location
--actor <workerId>        # Impersonate worker
```

## 10. Testing Strategy

### Unit Tests
- Every use case tested in isolation
- Mock storage adapter
- Property-based tests for complex logic (dependency cycles, etc.)

### Integration Tests
- CLI commands with temp filesystem
- API endpoints with test server
- MCP tools with mock client

### E2E Tests
- Full workflows: create project → add worker → create task → complete task
- Error scenarios: unauthorized access, invalid deps, etc.

### Security Tests
- Permission bypass attempts
- Injection attacks on inputs
- Path traversal in file storage

## 11. Quality Gates

Before merge:
1. All tests pass
2. Coverage >90%
3. No TypeScript errors (strict mode)
4. No lint errors
5. Security review for auth changes
6. Performance regression check

## 12. Implementation Phases

### Phase 1: Core (Week 1)
- Domain schemas
- Storage adapter (memory + filesystem)
- Worker & Project use cases
- Basic CLI

### Phase 2: Tasks (Week 2)
- Task use cases
- Dependency management
- Task CLI commands
- Integration tests

### Phase 3: Interfaces (Week 3)
- REST API
- MCP server
- Security hardening
- Performance optimization

### Phase 4: Polish (Week 4)
- Complete test coverage
- Documentation
- Example workflows
- Release

## 13. Success Criteria

- [ ] All 27 use cases implemented and tested
- [ ] CLI cold start <150ms (measured)
- [ ] >90% test coverage
- [ ] MCP server passes protocol compliance
- [ ] Security audit passed (no bypasses found)
- [ ] AI agent can complete full workflow via MCP
- [ ] Human can complete full workflow via CLI
- [ ] REST API handles 100 concurrent requests

---

**Status:** READY FOR IMPLEMENTATION
**Breaking Changes:** Complete rewrite from v2
**Migration:** None (fresh start)
