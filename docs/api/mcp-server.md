# OCT MCP Server Reference

Complete reference for the OCT (OpenClaw Task Manager) Model Context Protocol (MCP) server.

## Overview

The OCT MCP server exposes task management capabilities to AI assistants through the Model Context Protocol. This enables Claude and other MCP-compatible clients to interact with OCT directly.

## Installation

The MCP server is included in the OCT monorepo:

```bash
# Build the MCP package
pnpm --filter @oct/mcp build

# Run the MCP server
pnpm --filter @oct/mcp start
```

## Configuration

### Claude Code Configuration

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "oct": {
      "command": "node",
      "args": ["/path/to/oct/packages/mcp/dist/index.js"],
      "env": {
        "OCT_STORAGE_PATH": "~/.oct/db",
        "OCT_WORKSPACE_ID": "default"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OCT_STORAGE_PATH` | `~/.oct/db` | Path to data storage |
| `OCT_WORKSPACE_ID` | `default` | Default workspace ID |
| `OCT_LOG_LEVEL` | `info` | Logging level |

## Available Tools

### Worker Tools

#### `worker_create`

Create a new worker (human or AI agent).

**Input:**

```json
{
  "name": "Alice Smith",
  "type": "human",
  "roles": ["developer"],
  "permissions": ["task:create", "task:read", "task:update"]
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name (1-256 chars) |
| `type` | string | Yes | `"human"` or `"agent"` |
| `roles` | string[] | No | Role identifiers |
| `permissions` | string[] | No | Granted permissions |

**Output:**

```json
{
  "workerId": "worker-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
  "name": "Alice Smith",
  "type": "human",
  "roles": ["developer"],
  "permissions": ["task:create", "task:read", "task:update"],
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:00:00.000Z"
}
```

**Example Usage:**

```
Please create a new worker named "Bob" who is a human developer with task permissions.
```

---

#### `worker_list`

List all workers.

**Input:**

```json
{}
```

**Output:**

```json
{
  "workers": [
    {
      "workerId": "worker-...",
      "name": "Alice Smith",
      "type": "human",
      "roles": ["developer"],
      "permissions": ["task:create", "task:read"],
      "createdAt": "2026-02-09T12:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    }
  ]
}
```

**Example Usage:**

```
Show me all workers in the system.
```

---

#### `worker_get`

Get a specific worker by ID.

**Input:**

```json
{
  "workerId": "worker-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workerId` | string | Yes | Worker identifier |

**Output:**

```json
{
  "workerId": "worker-...",
  "name": "Alice Smith",
  "type": "human",
  "roles": ["developer"],
  "permissions": ["task:create", "task:read"],
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:00:00.000Z"
}
```

**Example Usage:**

```
Get details for worker worker-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.
```

---

#### `worker_update`

Update worker information.

**Input:**

```json
{
  "workerId": "worker-018f...",
  "name": "Alice Johnson",
  "roles": ["developer", "lead"]
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workerId` | string | Yes | Worker to update |
| `name` | string | No | New display name |
| `roles` | string[] | No | Replace roles |
| `permissions` | string[] | No | Replace permissions |

**Output:**

```json
{
  "workerId": "worker-...",
  "name": "Alice Johnson",
  "type": "human",
  "roles": ["developer", "lead"],
  "permissions": ["task:create", "task:read"],
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Update worker worker-018f... to have the "lead" role.
```

---

#### `worker_delete`

Delete a worker.

**Input:**

```json
{
  "workerId": "worker-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workerId` | string | Yes | Worker to delete |

**Output:**

```json
{
  "success": true
}
```

**Example Usage:**

```
Delete worker worker-018f... from the system.
```

---

### Project Tools

#### `project_create`

Create a new project.

**Input:**

```json
{
  "name": "Website Redesign",
  "description": "Redesign company website with modern UI",
  "parentId": "proj-parent-id",
  "memberIds": ["worker-123", "worker-456"]
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name (1-256 chars) |
| `description` | string | No | Project description |
| `parentId` | string | No | Parent project for sub-projects |
| `memberIds` | string[] | No | Initial member worker IDs |

**Output:**

```json
{
  "projectId": "proj-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
  "name": "Website Redesign",
  "description": "Redesign company website with modern UI",
  "parentId": null,
  "memberIds": ["worker-123", "worker-456"],
  "status": "active",
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:00:00.000Z"
}
```

**Example Usage:**

```
Create a new project called "Website Redesign" with Alice and Bob as members.
```

---

#### `project_list`

List projects with optional filtering.

**Input:**

```json
{
  "status": "active",
  "parentId": null
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter: `active`, `archived` |
| `parentId` | string | No | Filter by parent project |

**Output:**

```json
{
  "projects": [
    {
      "projectId": "proj-...",
      "name": "Website Redesign",
      "description": "...",
      "parentId": null,
      "memberIds": ["worker-123"],
      "status": "active",
      "createdAt": "2026-02-09T12:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    }
  ]
}
```

**Example Usage:**

```
List all active projects.
```

---

#### `project_get`

Get a specific project.

**Input:**

```json
{
  "projectId": "proj-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Project identifier |

**Output:**

```json
{
  "projectId": "proj-...",
  "name": "Website Redesign",
  "description": "...",
  "parentId": null,
  "memberIds": ["worker-123"],
  "status": "active",
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:00:00.000Z"
}
```

**Example Usage:**

```
Show me the details for project proj-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.
```

---

#### `project_update`

Update project information.

**Input:**

```json
{
  "projectId": "proj-018f...",
  "name": "Website Redesign Q2",
  "description": "Updated description"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Project to update |
| `name` | string | No | New project name |
| `description` | string | No | New description |

**Output:**

```json
{
  "projectId": "proj-...",
  "name": "Website Redesign Q2",
  "description": "Updated description",
  "parentId": null,
  "memberIds": ["worker-123"],
  "status": "active",
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Rename project proj-018f... to "Website Redesign Q2".
```

---

#### `project_archive`

Archive a project.

**Input:**

```json
{
  "projectId": "proj-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Project to archive |

**Output:**

```json
{
  "projectId": "proj-...",
  "name": "Website Redesign",
  "status": "archived",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Archive the Website Redesign project.
```

---

#### `project_delete`

Delete a project permanently.

**Input:**

```json
{
  "projectId": "proj-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Project to delete |

**Output:**

```json
{
  "success": true
}
```

**Example Usage:**

```
Delete project proj-018f... permanently.
```

---

#### `project_add_member`

Add a member to a project.

**Input:**

```json
{
  "projectId": "proj-018f...",
  "workerId": "worker-789"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Target project |
| `workerId` | string | Yes | Worker to add |

**Output:**

```json
{
  "projectId": "proj-...",
  "memberIds": ["worker-123", "worker-456", "worker-789"],
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Add worker-789 to the Website Redesign project.
```

---

#### `project_remove_member`

Remove a member from a project.

**Input:**

```json
{
  "projectId": "proj-018f...",
  "workerId": "worker-789"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Target project |
| `workerId` | string | Yes | Worker to remove |

**Output:**

```json
{
  "projectId": "proj-...",
  "memberIds": ["worker-123", "worker-456"],
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Remove worker-789 from the Website Redesign project.
```

---

### Task Tools

#### `task_create`

Create a new task in a project.

**Input:**

```json
{
  "projectId": "proj-018f...",
  "title": "Implement login page",
  "description": "Create login form with email and password fields",
  "ownerId": "worker-123",
  "priority": 1,
  "dependencies": ["task-dependency-id"]
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Parent project ID |
| `title` | string | Yes | Task title (1-256 chars) |
| `description` | string | No | Task details |
| `ownerId` | string | Yes | Assigned worker ID |
| `priority` | number | No | Priority 1-4 (1=highest, default: 2) |
| `dependencies` | string[] | No | Task IDs that must complete first |

**Output:**

```json
{
  "taskId": "task-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
  "projectId": "proj-...",
  "title": "Implement login page",
  "description": "Create login form...",
  "ownerId": "worker-123",
  "status": "backlog",
  "priority": 1,
  "dependencies": ["task-dependency-id"],
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:00:00.000Z"
}
```

**Example Usage:**

```
Create a task "Implement login page" in project proj-... and assign it to worker-123.
```

---

#### `task_list`

List tasks with filtering.

**Input:**

```json
{
  "projectId": "proj-018f...",
  "ownerId": "worker-123",
  "status": "ready",
  "priority": 1
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | No | Filter by project |
| `ownerId` | string | No | Filter by owner |
| `status` | string | No | Filter by status |
| `priority` | number | No | Filter by priority (1-4) |

**Output:**

```json
{
  "tasks": [
    {
      "taskId": "task-...",
      "projectId": "proj-...",
      "title": "Implement login page",
      "description": "...",
      "ownerId": "worker-123",
      "status": "ready",
      "priority": 1,
      "dependencies": [],
      "createdAt": "2026-02-09T12:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    }
  ]
}
```

**Example Usage:**

```
List all ready tasks assigned to worker-123 in project proj-....
```

---

#### `task_get`

Get a specific task.

**Input:**

```json
{
  "taskId": "task-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task identifier |

**Output:**

```json
{
  "taskId": "task-...",
  "projectId": "proj-...",
  "title": "Implement login page",
  "description": "...",
  "ownerId": "worker-123",
  "status": "active",
  "priority": 1,
  "dependencies": [],
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:00:00.000Z"
}
```

**Example Usage:**

```
Get details for task task-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.
```

---

#### `task_update`

Update task information.

**Input:**

```json
{
  "taskId": "task-018f...",
  "title": "Updated title",
  "description": "Updated description",
  "priority": 2
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task to update |
| `title` | string | No | New title |
| `description` | string | No | New description |
| `priority` | number | No | New priority (1-4) |

**Output:**

```json
{
  "taskId": "task-...",
  "projectId": "proj-...",
  "title": "Updated title",
  "description": "Updated description",
  "ownerId": "worker-123",
  "status": "active",
  "priority": 2,
  "dependencies": [],
  "createdAt": "2026-02-09T12:00:00.000Z",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Update task task-018f... to have higher priority.
```

---

#### `task_move`

Move a task to a different project.

**Input:**

```json
{
  "taskId": "task-018f...",
  "newProjectId": "proj-new-id"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task to move |
| `newProjectId` | string | Yes | Destination project |

**Output:**

```json
{
  "taskId": "task-...",
  "projectId": "proj-new-id",
  "title": "...",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Move task task-018f... to project proj-new-id.
```

---

#### `task_delete`

Delete a task.

**Input:**

```json
{
  "taskId": "task-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task to delete |

**Output:**

```json
{
  "success": true
}
```

**Example Usage:**

```
Delete task task-018f... from the system.
```

---

#### `task_start`

Start working on a task.

**Input:**

```json
{
  "taskId": "task-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task to start |

**Output:**

```json
{
  "taskId": "task-...",
  "status": "active",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Start working on task task-018f....
```

---

#### `task_complete`

Mark a task as complete.

**Input:**

```json
{
  "taskId": "task-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task to complete |

**Output:**

```json
{
  "taskId": "task-...",
  "status": "review",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Mark task task-018f... as complete.
```

---

#### `task_reopen`

Reopen a completed task.

**Input:**

```json
{
  "taskId": "task-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task to reopen |

**Output:**

```json
{
  "taskId": "task-...",
  "status": "backlog",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Reopen task task-018f... for more work.
```

---

#### `task_assign`

Assign a task to a different worker.

**Input:**

```json
{
  "taskId": "task-018f...",
  "workerId": "worker-new-owner"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task to reassign |
| `workerId` | string | Yes | New owner |

**Output:**

```json
{
  "taskId": "task-...",
  "ownerId": "worker-new-owner",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Example Usage:**

```
Reassign task task-018f... to worker-new-owner.
```

---

### Summary Tools

#### `summary_ready_tasks`

Get tasks that are ready to be started.

**Input:**

```json
{
  "projectId": "proj-018f...",
  "workerId": "worker-123"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | No | Filter by project |
| `workerId` | string | No | Filter by assignable worker |

**Output:**

```json
{
  "tasks": [
    {
      "taskId": "task-...",
      "title": "Ready to start task",
      "status": "ready",
      "priority": 1
    }
  ]
}
```

**Example Usage:**

```
What tasks are ready for worker-123 to start?
```

---

#### `summary_blocked_tasks`

Get tasks that are blocked and their blockers.

**Input:**

```json
{
  "projectId": "proj-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | No | Filter by project |

**Output:**

```json
{
  "tasks": [
    {
      "task": {
        "taskId": "task-blocked",
        "title": "Blocked task",
        "status": "blocked"
      },
      "blockedBy": [
        {
          "taskId": "task-blocker",
          "title": "Blocking task",
          "status": "active"
        }
      ]
    }
  ]
}
```

**Example Usage:**

```
Show me all blocked tasks and what's blocking them.
```

---

#### `summary_project_stats`

Get statistics for a project.

**Input:**

```json
{
  "projectId": "proj-018f..."
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Project identifier |

**Output:**

```json
{
  "stats": {
    "totalTasks": 10,
    "byStatus": {
      "backlog": 2,
      "ready": 3,
      "active": 2,
      "blocked": 1,
      "review": 1,
      "done": 1
    },
    "byPriority": {
      "1": 2,
      "2": 5,
      "3": 2,
      "4": 1
    }
  }
}
```

**Example Usage:**

```
Get statistics for project proj-018f....
```

---

#### `summary_worker_workload`

Get workload statistics for a worker.

**Input:**

```json
{
  "workerId": "worker-123"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workerId` | string | Yes | Worker identifier |

**Output:**

```json
{
  "workload": {
    "totalTasks": 5,
    "activeTasks": 2,
    "readyTasks": 1,
    "blockedTasks": 1,
    "reviewTasks": 1
  }
}
```

**Example Usage:**

```
What's the current workload for worker-123?
```

---

## Usage Examples with Claude Code

### Example 1: Setting Up a Project

```
User: I need to set up a new project for our website redesign with Alice and Bob on the team.

Claude: I'll help you set up the website redesign project. First, let me check if Alice and Bob exist as workers, then create the project.

[Claude uses worker_list to check existing workers]
[Claude uses worker_create if needed]
[Claude uses project_create with memberIds]

Claude: I've created the "Website Redesign" project with Alice and Bob as team members.
The project ID is proj-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.
```

### Example 2: Managing Tasks

```
User: Create a task for implementing the login page and assign it to Alice.

Claude: I'll create that task for you.

[Claude uses task_create with ownerId set to Alice's worker ID]

Claude: I've created the task "Implement login page" and assigned it to Alice.
The task ID is task-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b.
```

### Example 3: Tracking Progress

```
User: What's the status of the Website Redesign project?

Claude: Let me get the project statistics for you.

[Claude uses summary_project_stats]

Claude: Here's the current status:
- Total tasks: 10
- Done: 3
- In review: 2
- Active: 2
- Ready to start: 2
- Blocked: 1

Would you like me to show you the blocked task details?
```

### Example 4: Finding Work

```
User: What tasks are ready for Bob to work on?

Claude: Let me check what tasks are ready for Bob.

[Claude uses summary_ready_tasks with workerId filter]

Claude: Bob has 2 tasks ready to start:
1. "Implement signup form" (Priority 1)
2. "Add password reset" (Priority 2)
```

---

## Error Handling

MCP tools return errors in a consistent format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task not found: task-018f...",
    "retryable": false
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Permission denied |
| `NOT_FOUND` | Resource not found |
| `INVALID_INPUT` | Missing or invalid parameters |
| `CONFLICT` | Resource conflict |
| `INTERNAL_ERROR` | Server error |

---

## Permissions

The MCP server uses the following permission system:

### Worker Permissions
- `worker:create` - Create new workers
- `worker:read` - View worker information
- `worker:update` - Modify worker details
- `worker:delete` - Delete workers

### Project Permissions
- `project:create` - Create projects
- `project:read` - View projects
- `project:update` - Modify projects
- `project:delete` - Delete projects
- `project:manage-members` - Add/remove members

### Task Permissions
- `task:create` - Create tasks
- `task:read` - View tasks
- `task:update` - Modify tasks
- `task:delete` - Delete tasks
- `task:start` - Start tasks
- `task:complete` - Complete tasks
- `task:reopen` - Reopen completed tasks
- `task:assign` - Reassign tasks
