# OCT REST API Reference

Complete reference for the OCT (OpenClaw Task Manager) REST API.

## Base URL

```
http://localhost:3000
```

Configure via environment variable:

```bash
export PORT=3000      # Server port
export HOST=0.0.0.0   # Server host
```

## Authentication

OCT v3 uses header-based authentication. Include the actor and permissions in request headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Actor-ID` | ID of the acting user/agent | `worker-123` |
| `X-Workspace-ID` | Workspace identifier | `default` |
| `X-Permissions` | Comma-separated permissions | `task:create,task:read` |

### Permission Values

```
worker:create, worker:read, worker:update, worker:delete
project:create, project:read, project:update, project:delete, project:manage-members
task:create, task:read, task:update, task:delete, task:start, task:complete, task:reopen, task:assign
```

## Response Format

All responses follow a consistent envelope format:

### Success Response

```json
{
  "ok": true,
  "data": { ... }
}
```

### Error Response

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

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_INPUT` | 400 | Missing or invalid parameters |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate, circular dependency) |
| `INTERNAL_ERROR` | 500 | Server error |

## Endpoints

### Health Check

#### GET /health

Check API availability.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-09T12:00:00.000Z"
}
```

---

## Workers

Workers represent users (human or AI agents) who can own and execute tasks.

### Create Worker

#### POST /v1/workers

Create a new worker.

**Request Body:**

```json
{
  "name": "Alice Smith",
  "type": "human",
  "roles": ["developer", "admin"],
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

**Response (201):**

```json
{
  "ok": true,
  "data": {
    "worker": {
      "workerId": "worker-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
      "name": "Alice Smith",
      "type": "human",
      "roles": ["developer", "admin"],
      "permissions": ["task:create", "task:read", "task:update"],
      "createdAt": "2026-02-09T12:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    }
  }
}
```

### List Workers

#### GET /v1/workers

List all workers.

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "workers": [
      {
        "workerId": "worker-018f...",
        "name": "Alice Smith",
        "type": "human",
        "roles": ["developer"],
        "permissions": ["task:create", "task:read"],
        "createdAt": "2026-02-09T12:00:00.000Z",
        "updatedAt": "2026-02-09T12:00:00.000Z"
      }
    ]
  }
}
```

### Get Worker

#### GET /v1/workers/:workerId

Get a specific worker by ID.

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "worker": {
      "workerId": "worker-018f...",
      "name": "Alice Smith",
      "type": "human",
      "roles": ["developer"],
      "permissions": ["task:create", "task:read"],
      "createdAt": "2026-02-09T12:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    }
  }
}
```

### Update Worker

#### PATCH /v1/workers/:workerId

Update worker information.

**Request Body:**

```json
{
  "name": "Alice Johnson",
  "roles": ["developer", "lead"],
  "permissions": ["task:create", "task:read", "task:delete"]
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | New display name |
| `roles` | string[] | No | Replace roles |
| `permissions` | string[] | No | Replace permissions |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "worker": { ... }
  }
}
```

### Delete Worker

#### DELETE /v1/workers/:workerId

Delete a worker.

**Response (200):**

```json
{
  "ok": true,
  "data": {}
}
```

---

## Projects

Projects organize tasks and contain members who can work on them.

### Create Project

#### POST /v1/projects

Create a new project.

**Request Body:**

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
| `description` | string | No | Project description (max 10000 chars) |
| `parentId` | string | No | Parent project ID for sub-projects |
| `memberIds` | string[] | No | Initial member worker IDs |

**Response (201):**

```json
{
  "ok": true,
  "data": {
    "project": {
      "projectId": "proj-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
      "name": "Website Redesign",
      "description": "Redesign company website with modern UI",
      "parentId": null,
      "memberIds": ["worker-123", "worker-456"],
      "status": "active",
      "createdAt": "2026-02-09T12:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    }
  }
}
```

### List Projects

#### GET /v1/projects

List projects with optional filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `active`, `archived` |
| `parentId` | string | Filter by parent project |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "projects": [
      {
        "projectId": "proj-018f...",
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
}
```

### Get Project

#### GET /v1/projects/:projectId

Get a specific project.

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "project": { ... }
  }
}
```

### Update Project

#### PATCH /v1/projects/:projectId

Update project information.

**Request Body:**

```json
{
  "name": "Website Redesign Q2",
  "description": "Updated description"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | New project name |
| `description` | string | No | New description |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "project": { ... }
  }
}
```

### Archive Project

#### POST /v1/projects/:projectId/archive

Archive a project (soft delete).

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "project": {
      ...,
      "status": "archived"
    }
  }
}
```

### Delete Project

#### DELETE /v1/projects/:projectId

Permanently delete a project.

**Response (200):**

```json
{
  "ok": true,
  "data": {}
}
```

### Add Project Member

#### POST /v1/projects/:projectId/members

Add a member to a project.

**Request Body:**

```json
{
  "workerId": "worker-789"
}
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "project": { ... }
  }
}
```

### Remove Project Member

#### DELETE /v1/projects/:projectId/members/:workerId

Remove a member from a project.

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "project": { ... }
  }
}
```

---

## Tasks

Tasks are the core work units within projects.

### Task Status Values

| Status | Description |
|--------|-------------|
| `backlog` | Not ready to start |
| `ready` | Dependencies satisfied, can be started |
| `active` | Currently in progress |
| `blocked` | Waiting on dependencies |
| `review` | Completed, pending review |
| `done` | Finished and approved |

### Create Task

#### POST /v1/tasks

Create a new task in a project.

**Request Body:**

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
| `description` | string | No | Task details (max 10000 chars) |
| `ownerId` | string | Yes | Assigned worker ID |
| `priority` | number | No | Priority 1-4 (1=highest, default: 2) |
| `dependencies` | string[] | No | Task IDs that must complete first |

**Response (201):**

```json
{
  "ok": true,
  "data": {
    "task": {
      "taskId": "task-018f3b8a-7c4d-7e8f-9a0b-1c2d3e4f5a6b",
      "projectId": "proj-018f...",
      "title": "Implement login page",
      "description": "Create login form...",
      "ownerId": "worker-123",
      "status": "backlog",
      "priority": 1,
      "dependencies": ["task-dependency-id"],
      "createdAt": "2026-02-09T12:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    }
  }
}
```

### List Tasks

#### GET /v1/tasks

List tasks with filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | Filter by project |
| `ownerId` | string | Filter by owner |
| `status` | string | Filter by status |
| `priority` | number | Filter by priority (1-4) |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "tasks": [
      {
        "taskId": "task-018f...",
        "projectId": "proj-018f...",
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
}
```

### Get Task

#### GET /v1/tasks/:taskId

Get a specific task.

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "task": { ... }
  }
}
```

### Update Task

#### PATCH /v1/tasks/:taskId

Update task information.

**Request Body:**

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": 2
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | New title |
| `description` | string | No | New description |
| `priority` | number | No | New priority (1-4) |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "task": { ... }
  }
}
```

### Move Task

#### POST /v1/tasks/:taskId/move

Move a task to a different project.

**Request Body:**

```json
{
  "newProjectId": "proj-new-id"
}
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "task": { ... }
  }
}
```

### Delete Task

#### DELETE /v1/tasks/:taskId

Delete a task.

**Response (200):**

```json
{
  "ok": true,
  "data": {}
}
```

### Start Task

#### POST /v1/tasks/:taskId/start

Start working on a task (transitions to `active`).

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "task": {
      ...,
      "status": "active"
    }
  }
}
```

### Complete Task

#### POST /v1/tasks/:taskId/complete

Mark a task as complete (transitions to `review` or `done`).

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "task": {
      ...,
      "status": "review"
    }
  }
}
```

### Reopen Task

#### POST /v1/tasks/:taskId/reopen

Reopen a completed task (transitions to `backlog`).

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "task": {
      ...,
      "status": "backlog"
    }
  }
}
```

### Assign Task

#### POST /v1/tasks/:taskId/assign

Assign a task to a different worker.

**Request Body:**

```json
{
  "workerId": "worker-new-owner"
}
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "task": {
      ...,
      "ownerId": "worker-new-owner"
    }
  }
}
```

---

## Summary/Stats

### Get Ready Tasks

#### GET /v1/tasks/ready

Get tasks that are ready to be started (dependencies satisfied).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | Filter by project |
| `workerId` | string | Filter by assignable worker |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "tasks": [ ... ]
  }
}
```

### Get Blocked Tasks

#### GET /v1/tasks/blocked

Get tasks that are blocked and their blockers.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | Filter by project |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "tasks": [
      {
        "task": { ... },
        "blockedBy": [ { ... }, { ... } ]
      }
    ]
  }
}
```

### Get Project Stats

#### GET /v1/projects/:projectId/stats

Get statistics for a project.

**Response (200):**

```json
{
  "ok": true,
  "data": {
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
}
```

### Get Worker Workload

#### GET /v1/workers/:workerId/workload

Get workload statistics for a worker.

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "workload": {
      "totalTasks": 5,
      "activeTasks": 2,
      "readyTasks": 1,
      "blockedTasks": 1,
      "reviewTasks": 1
    }
  }
}
```

---

## Usage Examples

### cURL Examples

```bash
# Create a worker
curl -X POST http://localhost:3000/v1/workers \
  -H "Content-Type: application/json" \
  -H "X-Actor-ID: system" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: worker:create" \
  -d '{
    "name": "Alice",
    "type": "human",
    "permissions": ["task:create", "task:read"]
  }'

# Create a project
curl -X POST http://localhost:3000/v1/projects \
  -H "Content-Type: application/json" \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: project:create" \
  -d '{
    "name": "My Project",
    "description": "Project description"
  }'

# Create a task
curl -X POST http://localhost:3000/v1/tasks \
  -H "Content-Type: application/json" \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: task:create" \
  -d '{
    "projectId": "proj-...",
    "title": "Implement feature",
    "ownerId": "worker-123"
  }'

# List tasks
curl "http://localhost:3000/v1/tasks?status=ready" \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: task:read"

# Start a task
curl -X POST http://localhost:3000/v1/tasks/task-.../start \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: task:start"
```

### JavaScript/TypeScript Example

```typescript
const API_URL = 'http://localhost:3000';

async function createTask(projectId: string, title: string, ownerId: string) {
  const response = await fetch(`${API_URL}/v1/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Actor-ID': ownerId,
      'X-Workspace-ID': 'default',
      'X-Permissions': 'task:create,task:read',
    },
    body: JSON.stringify({
      projectId,
      title,
      ownerId,
      priority: 2,
    }),
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data.task;
}
```

---

## Rate Limiting

Currently, OCT does not implement rate limiting. For production deployments, consider adding a reverse proxy with rate limiting capabilities.

## CORS

CORS is enabled by default. All origins are allowed with credentials support.
