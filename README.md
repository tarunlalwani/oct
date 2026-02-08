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
- **Dual interface** - Use via CLI or REST API

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
