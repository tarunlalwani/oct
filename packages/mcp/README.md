# @oct/mcp

MCP (Model Context Protocol) server for OCT (OpenClaw Task Manager).

## Overview

This package provides an MCP server that exposes OCT functionality to AI agents through the Model Context Protocol. It uses stdio transport for integration with Claude Code and other MCP-compatible clients.

## Installation

```bash
pnpm install
pnpm build
```

## Usage

### Running the MCP Server

```bash
# Using the CLI
oct-mcp

# Or directly
node dist/index.js
```

### Environment Variables

- `OCT_DB_PATH` - Path to the database directory (default: `~/.oct/db`)
- `OCT_WORKSPACE_ID` - Workspace identifier (default: `default`)

## MCP Tools

### Worker Tools

#### `oct_worker_create`
Create a new worker (human or agent).

**Input:**
```json
{
  "name": "John Doe",
  "type": "human",
  "roles": ["developer"]
}
```

**Output:**
```json
{
  "workerId": "worker-xxx",
  "name": "John Doe",
  "type": "human",
  "roles": ["developer"],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### `oct_worker_list`
List all workers with optional type filter.

**Input:**
```json
{
  "type": "human"
}
```

**Output:**
```json
{
  "workers": [
    {
      "workerId": "worker-xxx",
      "name": "John Doe",
      "type": "human",
      "roles": ["developer"],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `oct_worker_get`
Get worker by ID.

**Input:**
```json
{
  "workerId": "worker-xxx"
}
```

**Output:**
```json
{
  "workerId": "worker-xxx",
  "name": "John Doe",
  "type": "human",
  "roles": ["developer"],
  "permissions": [],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### `oct_worker_delete`
Delete worker by ID.

**Input:**
```json
{
  "workerId": "worker-xxx"
}
```

**Output:**
```json
{
  "success": true,
  "message": "worker-xxx deleted successfully"
}
```

### Project Tools

#### `oct_project_create`
Create a new project.

**Input:**
```json
{
  "name": "My Project",
  "description": "Project description",
  "parentId": "parent-project-id",
  "memberIds": ["worker-xxx"]
}
```

**Output:**
```json
{
  "projectId": "proj-xxx",
  "name": "My Project",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### `oct_project_list`
List all projects with optional filters.

**Input:**
```json
{
  "status": "active",
  "parentId": "parent-project-id"
}
```

**Output:**
```json
{
  "projects": [
    {
      "projectId": "proj-xxx",
      "name": "My Project",
      "description": "Project description",
      "status": "active",
      "parentId": null,
      "memberIds": ["worker-xxx"],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `oct_project_get`
Get project by ID.

**Input:**
```json
{
  "projectId": "proj-xxx"
}
```

**Output:**
```json
{
  "projectId": "proj-xxx",
  "name": "My Project",
  "description": "Project description",
  "status": "active",
  "parentId": null,
  "memberIds": ["worker-xxx"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Task Tools

#### `oct_task_create`
Create a new task with dependencies.

**Input:**
```json
{
  "projectId": "proj-xxx",
  "title": "Implement feature",
  "description": "Task description",
  "ownerId": "worker-xxx",
  "priority": 1,
  "dependencies": ["task-xxx"]
}
```

**Output:**
```json
{
  "taskId": "task-xxx",
  "projectId": "proj-xxx",
  "title": "Implement feature",
  "status": "backlog",
  "priority": 1,
  "ownerId": "worker-xxx",
  "dependencies": ["task-xxx"],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### `oct_task_list`
List tasks with filters.

**Input:**
```json
{
  "projectId": "proj-xxx",
  "ownerId": "worker-xxx",
  "status": "backlog",
  "priority": 1
}
```

**Output:**
```json
{
  "tasks": [
    {
      "taskId": "task-xxx",
      "projectId": "proj-xxx",
      "title": "Implement feature",
      "status": "backlog",
      "priority": 1,
      "ownerId": "worker-xxx",
      "dependencies": [],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `oct_task_get`
Get task by ID.

**Input:**
```json
{
  "taskId": "task-xxx"
}
```

**Output:**
```json
{
  "taskId": "task-xxx",
  "projectId": "proj-xxx",
  "title": "Implement feature",
  "description": "Task description",
  "status": "backlog",
  "priority": 1,
  "ownerId": "worker-xxx",
  "dependencies": [],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### `oct_task_update`
Update task status, assignee, priority, title, or description.

**Input:**
```json
{
  "taskId": "task-xxx",
  "status": "active",
  "ownerId": "worker-yyy",
  "priority": 2,
  "title": "Updated title",
  "description": "Updated description"
}
```

**Output:**
```json
{
  "taskId": "task-xxx",
  "projectId": "proj-xxx",
  "title": "Updated title",
  "description": "Updated description",
  "status": "active",
  "priority": 2,
  "ownerId": "worker-yyy",
  "dependencies": [],
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Architecture

### Security

The MCP server runs with full permissions (all `PERMISSIONS` values) because it acts as a trusted interface layer. All underlying use cases still perform their own validation and permission checks.

The `ExecutionContext` for MCP operations has:
- `actorId`: `'mcp-server'`
- `permissions`: All available permissions
- `environment`: `'local'`
- `traceId`: Random UUID for each context

### Error Handling

All tools return structured error responses:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error description"
}
```

Common error codes:
- `INVALID_INPUT` - Missing or invalid parameters
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Permission denied
- `CONFLICT` - State violation (e.g., circular dependencies)

## Development

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Build
pnpm build
```

## License

MIT
