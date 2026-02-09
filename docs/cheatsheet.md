# OCT CLI Cheatsheet

Quick reference for the OpenClaw Task Manager CLI.

## Command Overview

| Command | Description | Example |
|---------|-------------|---------|
| `oct task create` | Create a new task | `oct task create --title "Deploy"` |
| `oct task list` | List all tasks | `oct task list --limit 10` |
| `oct task get` | Get task details | `oct task get --id <taskId>` |
| `oct task run` | Execute a task | `oct task run --id <taskId>` |
| `oct --version` | Show version | `oct --version` |
| `oct --help` | Show help | `oct --help` |

## Global Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--json` | Output JSON instead of human-readable | `oct task list --json` |
| `--remote` | Call REST API instead of local Core | `oct task get --id 1 --remote` |
| `--version` | Show version information | `oct --version` |
| `--help` | Show help for any command | `oct task create --help` |

## Task Commands

### Create Task

```bash
# Human-readable output
oct task create --title "Task name" [--description "Details"]

# JSON output
oct task create --title "Task name" --json

# Capture task ID for scripting
ID=$(oct task create --title "Task name" --json | jq -r '.data.task.taskId')
```

### List Tasks

```bash
# Default list
oct task list

# Paginated list
oct task list --limit 20 --cursor <cursor_value>

# JSON output with jq parsing
oct task list --json | jq '.data.tasks[] | {id: .taskId, title: .title}'
```

### Get Task

```bash
# Get single task
oct task get --id <taskId>

# JSON output
oct task get --id <taskId> --json

# Extract specific field
oct task get --id <taskId> --json | jq -r '.data.task.status'
```

### Run Task

```bash
# Execute task
oct task run --id <taskId>

# JSON output
oct task run --id <taskId> --json
```

## Exit Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | `SUCCESS` | Command completed successfully |
| 1 | `INVALID_INPUT` | Missing or invalid arguments |
| 2 | `NOT_FOUND` | Task or resource not found |
| 3 | `UNAUTHORIZED` | Authentication required |
| 4 | `FORBIDDEN` | Permission denied |
| 5 | `CONFLICT` | Resource conflict (e.g., duplicate) |
| 6 | `INTERNAL_ERROR` | Server or internal error |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OCT_API_URL` | `http://localhost:3000` | Base URL for REST API calls |

## Common Workflows

### Create, Get, and Run

```bash
# Create task and capture ID
ID=$(oct task create --title "Deploy app" --description "Deploy to prod" --json | jq -r '.data.task.taskId')

# Verify task details
oct task get --id "$ID"

# Execute the task
oct task run --id "$ID"
```

### List and Filter

```bash
# Get all tasks and filter with jq
oct task list --json | jq '.data.tasks[] | select(.status == "pending")'

# Get task count
oct task list --json | jq '.data.tasks | length'
```

### Batch Operations

```bash
# Run all pending tasks
oct task list --json | jq -r '.data.tasks[] | select(.status == "pending") | .taskId' | \
  while read -r id; do
    oct task run --id "$id"
  done
```

### Remote API Workflow

```bash
# Set remote API endpoint
export OCT_API_URL="https://api.example.com"

# Use --remote flag for API calls
oct task list --remote --json
oct task get --id <taskId> --remote
```

## REST API Quick Reference

### Authentication Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-Actor-ID` | Acting user/agent ID | `worker-123` |
| `X-Workspace-ID` | Workspace identifier | `default` |
| `X-Permissions` | Comma-separated permissions | `task:create,task:read` |

### Common Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Create worker
curl -X POST http://localhost:3000/v1/workers \
  -H "Content-Type: application/json" \
  -H "X-Actor-ID: system" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: worker:create" \
  -d '{"name": "Alice", "type": "human", "permissions": ["task:create"]}'

# Create project
curl -X POST http://localhost:3000/v1/projects \
  -H "Content-Type: application/json" \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: project:create" \
  -d '{"name": "My Project", "description": "Project details"}'

# Create task
curl -X POST http://localhost:3000/v1/tasks \
  -H "Content-Type: application/json" \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: task:create" \
  -d '{"projectId": "proj-...", "title": "New task", "ownerId": "worker-123"}'

# List tasks with filter
curl "http://localhost:3000/v1/tasks?status=ready&ownerId=worker-123" \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: task:read"

# Start task
curl -X POST http://localhost:3000/v1/tasks/task-.../start \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: task:start"

# Complete task
curl -X POST http://localhost:3000/v1/tasks/task-.../complete \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: task:complete"

# Get project stats
curl http://localhost:3000/v1/projects/proj-.../stats \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: project:read"
```

### REST API Response Format

```json
// Success
{
  "ok": true,
  "data": { ... }
}

// Error
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Task not found",
    "retryable": false
  }
}
```

## MCP Server Quick Reference

### Configuration

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "oct": {
      "command": "node",
      "args": ["/path/to/oct/packages/mcp/dist/index.js"],
      "env": {
        "OCT_STORAGE_PATH": "~/.oct/db"
      }
    }
  }
}
```

### MCP Tool Examples

```
# Worker management
Create a new worker named "Alice" who is a human developer
List all workers in the system
Get details for worker worker-018f...

# Project management
Create a project "Website Redesign" with Alice and Bob as members
List all active projects
Archive project proj-018f...

# Task management
Create a task "Implement login" in project proj-... and assign to Alice
List all ready tasks assigned to worker-123
Start task task-018f...
Complete task task-018f...
Reassign task task-018f... to worker-456

# Summary and stats
What tasks are ready for Bob to work on?
Show me all blocked tasks and what's blocking them
Get statistics for project proj-018f...
What's the current workload for Alice?
```

### MCP Permissions

| Permission | Description |
|------------|-------------|
| `worker:create`, `worker:read`, `worker:update`, `worker:delete` | Worker management |
| `project:create`, `project:read`, `project:update`, `project:delete`, `project:manage-members` | Project management |
| `task:create`, `task:read`, `task:update`, `task:delete`, `task:start`, `task:complete`, `task:reopen`, `task:assign` | Task management |

## Error Handling in Scripts

```bash
# Check exit codes
if ! oct task get --id "$ID" --json > /dev/null 2>&1; then
  echo "Task not found (exit code 2)"
fi

# Conditional execution
oct task create --title "Test" --json && echo "Created successfully"
```
