# OCT (OpenClaw Task Manager)

A core-first task management platform with CLI and REST interfaces. Works locally without a server and is optimized for AI agent integration.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/openclaw/oct)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/openclaw/oct)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Create your first task
oct task create --title "My Task"
```

## Key Features

- **Local-first** - Works without a server, stores data locally
- **Core-first architecture** - Business logic in a reusable core layer
- **AI-agent compatible** - JSON mode output, no interactive prompts
- **Type-safe** - Result types with neverthrow for error handling
- **UUIDv7 IDs** - Time-sortable identifiers for better performance
- **Triple interface** - Use via CLI, REST API, or MCP server

## Installation

**Prerequisites:**
- Node.js >= 20
- pnpm 8.x

**Setup:**

```bash
# Clone the repository
git clone https://github.com/openclaw/oct.git
cd oct

# Install dependencies
pnpm install

# Build all packages
pnpm run build
```

## Usage Examples

```bash
# Create a task
oct task create --title "Deploy app" --description "Production deployment"

# List tasks
oct task list --json

# Get a task
oct task get --id <task-id>

# Run a task
oct task run --id <task-id>

# Use remote API instead of local core
oct task create --title "Remote task" --remote
```

## REST API

OCT includes a full REST API server for remote access and integrations.

**Start the server:**

```bash
# Start the REST API server
pnpm --filter @oct/server start

# Server runs on http://localhost:3000 by default
```

**Authentication:**

The REST API uses header-based authentication:

```bash
curl -X POST http://localhost:3000/v1/tasks \
  -H "Content-Type: application/json" \
  -H "X-Actor-ID: worker-123" \
  -H "X-Workspace-ID: default" \
  -H "X-Permissions: task:create,task:read" \
  -d '{"projectId": "proj-...", "title": "New task", "ownerId": "worker-123"}'
```

**Key endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/v1/workers` | GET/POST | List/create workers |
| `/v1/projects` | GET/POST | List/create projects |
| `/v1/tasks` | GET/POST | List/create tasks |
| `/v1/tasks/:id/start` | POST | Start a task |
| `/v1/tasks/:id/complete` | POST | Complete a task |

See [docs/api/rest-api.md](docs/api/rest-api.md) for complete API reference.

## MCP Server

OCT provides an MCP (Model Context Protocol) server for AI assistant integration.

**Configure with Claude Code:**

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

**Available tools:**

- `worker_create`, `worker_list`, `worker_get` - Manage workers
- `project_create`, `project_list`, `project_get` - Manage projects
- `task_create`, `task_list`, `task_get`, `task_start`, `task_complete` - Manage tasks
- `summary_project_stats`, `summary_worker_workload` - Get statistics

See [docs/api/mcp-server.md](docs/api/mcp-server.md) for complete tool reference.

## Architecture

OCT follows a three-layer architecture: **Core** (business logic and use cases), **Infrastructure** (repositories and external services), and **Interfaces** (CLI and REST server). The Core layer has zero dependencies and can be used independently.

See [docs/architecture/layers.md](docs/architecture/layers.md) for detailed documentation.

## Development

```bash
# Run all tests
pnpm test

# Run linter
pnpm lint

# Run CLI in development mode
pnpm --filter @oct/cli dev -- task create --title "Test"

# Run type checking
pnpm typecheck
```

## License

MIT
