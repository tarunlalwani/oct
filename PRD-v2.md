# Product Requirements Document (PRD) v2

## OCT Task Management System - AI Agent Native

---

## 1. Purpose & Vision

Build a task management system designed for AI agents and human collaboration with:
- Projects and sub-projects (hierarchical)
- Employees/Agents with role templates
- Task dependencies and workflows
- JSON file-based storage (pluggable for future DB)
- CLI + REST API + MCP interfaces
- **NO Web UI in this version** (v3 will add Web)

---

## 2. Core Domains

### 2.1 Project

A project is a container for tasks. Projects can be nested (sub-projects).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `projectId` | string | yes | UUIDv7 |
| `name` | string | yes | 1-256 chars |
| `description` | string | no | Markdown allowed |
| `parentId` | string | no | null = root project |
| `employeeIds` | string[] | yes | Who can work on this |
| `status` | enum | yes | active, archived, paused |
| `metadata` | object | no | Arbitrary key-value |
| `createdAt` | datetime | yes | ISO-8601 |
| `updatedAt` | datetime | yes | ISO-8601 |

**Rules:**
- Circular project hierarchies are forbidden
- Deleting a project requires all tasks to be completed/archived
- Archiving a project archives all its sub-projects

### 2.2 Employee (Agent/Human)

Employees are workers (human or AI) that own and execute tasks.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `employeeId` | string | yes | UUIDv7 |
| `name` | string | yes | Display name |
| `kind` | enum | yes | `human`, `ai` |
| `templateId` | string | no | Role template reference |
| `capabilities` | object | yes | See below |
| `metadata` | object | no | Arbitrary key-value |
| `createdAt` | datetime | yes | ISO-8601 |
| `updatedAt` | datetime | yes | ISO-8601 |

**Capabilities Object:**
```typescript
{
  canExecuteTasks: boolean
  canCreateTasks: boolean
  canAutoApprove: boolean  // AI agents may auto-approve their own work
}
```

### 2.3 EmployeeTemplate

Templates define role defaults. Employees linked to templates inherit defaults.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `templateId` | string | yes | UUIDv7 |
| `name` | string | yes | e.g., "backend-sr-java-engineer" |
| `description` | string | no | What this role does |
| `kind` | enum | yes | `human`, `ai` |
| `defaultCapabilities` | object | yes | Default capability values |
| `skills` | string[] | no | List of skills/tags |
| `metadata` | object | no | Arbitrary key-value |
| `version` | number | yes | Increment on update |
| `createdAt` | datetime | yes | ISO-8601 |
| `updatedAt` | datetime | yes | ISO-8601 |

**Template Linking:**
- When an employee references a template, they inherit its defaults
- Changes to template propagate to linked employees (refresh on read)
- Employee can override individual fields

### 2.4 Task

Tasks are the core work unit within a project.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `taskId` | string | yes | UUIDv7 |
| `projectId` | string | yes | Belongs to project |
| `title` | string | yes | 1-256 chars |
| `type` | string | yes | e.g., "feature", "bug", "docs" |
| `ownerId` | string | yes | Employee responsible |
| `context` | string | no | Background information |
| `goal` | string | no | What needs to be achieved |
| `deliverable` | string | no | Expected output |
| `status` | enum | yes | See TaskStatus below |
| `priority` | enum | yes | P0, P1, P2, P3 |
| `dependencies` | string[] | no | taskIds that block this task |
| `blockedBy` | string[] | no | Computed: tasks blocking this |
| `approval` | object | no | See Approval below |
| `metadata` | object | no | Arbitrary key-value |
| `createdAt` | datetime | yes | ISO-8601 |
| `updatedAt` | datetime | yes | ISO-8601 |

**TaskStatus Enum:**
- `backlog` - Not ready to start
- `todo` - Ready to work
- `in_progress` - Actively being worked
- `blocked` - Waiting on dependencies
- `in_review` - Pending approval
- `done` - Completed

**Priority Enum:**
- `P0` - Critical, drop everything
- `P1` - High priority
- `P2` - Normal priority
- `P3` - Low priority, backlog

**Approval Object:**
```typescript
{
  state: "pending" | "approved" | "rejected" | "auto_approved"
  approverId: string | null
  approvedAt: string | null
  policy: string  // e.g., "any-senior", "project-lead-only"
}
```

**Dependency Rules:**
- A task cannot be started (status = in_progress) if dependencies are not done
- Circular dependencies are forbidden
- When a dependency is marked done, blocked tasks should be notified (status auto-updates from blocked → todo)

---

## 3. Storage Architecture

### 3.1 Storage Adapter Pattern

```typescript
interface StorageAdapter {
  // Projects
  getProject(id: string): Promise<Project | null>
  saveProject(project: Project): Promise<void>
  deleteProject(id: string): Promise<void>
  listProjects(filter?: ProjectFilter): Promise<Project[]>

  // Employees
  getEmployee(id: string): Promise<Employee | null>
  saveEmployee(employee: Employee): Promise<void>
  deleteEmployee(id: string): Promise<void>
  listEmployees(filter?: EmployeeFilter): Promise<Employee[]>

  // Templates
  getTemplate(id: string): Promise<EmployeeTemplate | null>
  saveTemplate(template: EmployeeTemplate): Promise<void>
  listTemplates(): Promise<EmployeeTemplate[]>

  // Tasks
  getTask(id: string): Promise<Task | null>
  saveTask(task: Task): Promise<void>
  deleteTask(id: string): Promise<void>
  listTasks(filter?: TaskFilter): Promise<Task[]>

  // Queries
  getTasksByProject(projectId: string): Promise<Task[]>
  getSubProjects(parentId: string): Promise<Project[]>
  getTasksByOwner(employeeId: string): Promise<Task[]>
}
```

### 3.2 File System Adapter (v2 Default)

Storage location: `TM_ROOT_DB` env var or `~/.oct/db/`

Structure:
```
~/.oct/db/
├── projects/
│   ├── proj-001.json
│   └── proj-002.json
├── employees/
│   ├── emp-001.json
│   └── emp-002.json
├── templates/
│   ├── tmpl-001.json
│   └── tmpl-002.json
└── tasks/
    ├── task-001.json
    └── task-002.json
```

Each file contains one entity as JSON.

**Concurrency:**
- Simple file locking (lockfile per entity type)
- Atomic writes (write to temp, then rename)
- Acceptable for single-user CLI, local development

### 3.3 Future Adapters

- Convex adapter (for cloud/multi-user)
- SQLite adapter (for larger local datasets)
- PostgreSQL adapter (for production deployments)

---

## 4. Use Cases

### 4.1 Project Use Cases

| Use Case | Input | Output |
|----------|-------|--------|
| `createProject` | name, description, parentId?, employeeIds | Project |
| `updateProject` | projectId, updates | Project |
| `archiveProject` | projectId | Project |
| `deleteProject` | projectId | void |
| `getProject` | projectId | Project |
| `listProjects` | filter?, parentId? | Project[] |
| `addEmployeeToProject` | projectId, employeeId | Project |
| `removeEmployeeFromProject` | projectId, employeeId | Project |

### 4.2 Employee Use Cases

| Use Case | Input | Output |
|----------|-------|--------|
| `createEmployee` | name, kind, templateId?, capabilities | Employee |
| `updateEmployee` | employeeId, updates | Employee |
| `deleteEmployee` | employeeId | void |
| `getEmployee` | employeeId | Employee |
| `listEmployees` | filter?, kind? | Employee[] |
| `refreshFromTemplate` | employeeId | Employee |

### 4.3 Template Use Cases

| Use Case | Input | Output |
|----------|-------|--------|
| `createTemplate` | name, kind, defaultCapabilities, skills | Template |
| `updateTemplate` | templateId, updates | Template |
| `deleteTemplate` | templateId | void |
| `getTemplate` | templateId | Template |
| `listTemplates` | - | Template[] |

### 4.4 Task Use Cases

| Use Case | Input | Output |
|----------|-------|--------|
| `createTask` | projectId, title, type, ownerId, context?, goal?, deliverable?, priority?, dependencies? | Task |
| `updateTask` | taskId, updates | Task |
| `moveTask` | taskId, newProjectId | Task |
| `deleteTask` | taskId | void |
| `getTask` | taskId | Task |
| `listTasks` | filter?, projectId?, ownerId?, status? | Task[] |
| `startTask` | taskId | Task |
| `completeTask` | taskId | Task |
| `blockTask` | taskId, reason | Task |
| `approveTask` | taskId, approverId | Task |
| `rejectTask` | taskId, approverId, reason | Task |

### 4.5 Summary/Report Use Cases

| Use Case | Input | Output |
|----------|-------|--------|
| `getProjectSummary` | projectId | Stats object |
| `getEmployeeWorkload` | employeeId | Task counts by status |
| `getPendingApprovals` | approverId? | Task[] |
| `getBlockedTasks` | projectId? | Task[] with blockers |

---

## 5. Interfaces

### 5.1 CLI

Commands:
```bash
# Projects
oct project create --name "Website" --description "Company website"
oct project create --name "Marketing" --parent <website-id>
oct project list [--parent <id>]
oct project get --id <id>
oct project archive --id <id>

# Employees
oct employee create --name "Alice" --kind human --template <template-id>
oct employee create --name "CodeBot" --kind ai --template <ai-dev-template>
oct employee list [--kind ai|human]
oct employee get --id <id>

# Templates
oct template create --name "backend-sr-java" --kind human
oct template list
oct template get --id <id>

# Tasks
oct task create --project <id> --title "Fix auth" --type bug --owner <emp-id> --priority P0
oct task list [--project <id>] [--owner <id>] [--status <status>]
oct task get --id <id>
oct task start --id <id>
oct task complete --id <id>
oct task approve --id <id>

# Reports
oct summary --project <id>
oct workload --employee <id>
oct blocked

# Global flags
--json              # Machine-readable output
--remote            # Use REST API instead of local
--tm-root <path>    # Override storage location
```

### 5.2 REST API

Base: `/v1`

```
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
GET    /projects/:id/tasks

GET    /employees
POST   /employees
GET    /employees/:id
PATCH  /employees/:id
DELETE /employees/:id
GET    /employees/:id/tasks

GET    /templates
POST   /templates
GET    /templates/:id
PATCH  /templates/:id

GET    /tasks
POST   /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
POST   /tasks/:id/start
POST   /tasks/:id/complete
POST   /tasks/:id/approve
POST   /tasks/:id/reject

GET    /summary/projects/:id
GET    /summary/workload/:employeeId
GET    /summary/blocked
```

### 5.3 MCP (Model Context Protocol)

Tools exposed to AI agents:

```typescript
// Project tools
{
  "name": "project_create",
  "name": "project_list",
  "name": "project_get",
  "name": "project_archive"
}

// Employee tools
{
  "name": "employee_create",
  "name": "employee_list",
  "name": "employee_get"
}

// Template tools
{
  "name": "template_list",
  "name": "template_get"
}

// Task tools
{
  "name": "task_create",
  "name": "task_list",
  "name": "task_get",
  "name": "task_start",
  "name": "task_complete",
  "name": "task_approve"
}

// Summary tools
{
  "name": "summary_project",
  "name": "summary_workload",
  "name": "summary_blocked"
}
```

---

## 6. Error Handling

Same as v1: Domain errors with codes
- `NOT_FOUND` - Entity doesn't exist
- `INVALID_INPUT` - Validation failed
- `UNAUTHORIZED` - No actor
- `FORBIDDEN` - No permission
- `CONFLICT` - State violation (circular dependency, etc.)
- `INTERNAL_ERROR` - Unexpected error

---

## 7. Execution Context

```typescript
type ExecutionContext = {
  actorId: string | null
  workspaceId: string
  permissions: string[]
  environment: "local" | "ci" | "server"
  traceId?: string
}
```

---

## 8. Technology Choices

- Node.js >= 20
- TypeScript (strict mode)
- pnpm workspaces
- Zod for validation
- neverthrow for Result types
- Commander.js for CLI
- Fastify for REST API
- @modelcontextprotocol/sdk for MCP

---

## 9. Package Structure

```
packages/
├── core/           # Domain logic, use cases, schemas
├── storage-fs/     # File system adapter
├── cli/            # CLI interface
├── server/         # REST API server
└── mcp/            # MCP server
```

---

## 10. Out of Scope (v3)

- Web UI (will be `packages/web`)
- Real-time updates / WebSockets
- Email notifications
- Time tracking
- Billing/invoicing
- Multi-tenancy ( SaaS mode)
- Convex adapter (planned for v2.5)

---

## 11. Success Criteria

- [ ] All CRUD operations for Projects, Employees, Templates, Tasks
- [ ] Task dependencies and auto-unblocking
- [ ] Employee template linking and refresh
- [ ] Project hierarchy (parent/child)
- [ ] CLI works locally with file storage
- [ ] REST API can be deployed separately
- [ ] MCP server exposes all tools
- [ ] 100% of business logic in Core
- [ ] CLI cold start < 200ms

---

Status: DRAFT v2.0
